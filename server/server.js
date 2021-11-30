
//---Requirement Block----
require('dotenv').config()
const {CONNECTION_STRING} = process.env
const express = require ('express')
const path = require('path')
const cors = require('cors')
const axios = require('axios').default;
const cheerio = require('cheerio');
const moment = require('moment');
const { DataTypes } = require('sequelize/dist')
const {Sequelize, sequelize} = require('sequelize')

//---setting up sequelize
const db = new Sequelize(CONNECTION_STRING, {
    dialect: 'postgres',
    dialectOptions:{
        ssl: {
            rejectUnauthorized: false
        }
    },
    logging: false,
})
//---setting up express
const app = express()
app.use(express.json())
app.use(cors())
//-----------SEQUELIZE INIT-------------------

//---yanks data from steam for use in table
const getPageData = async () => {
    const response =  await axios.get('https://store.steampowered.com/search/?filter=popularnew&sort_by=Released_DESC&os=win');
    return response.data;
    // get page data > returns HTML
}
const parseGameRecords = (htmldata) => {
    const $ = cheerio.load(htmldata);
    const rows = $('#search_resultsRows')[0];
    const parsed = [];
    $('a', rows).each((i, el) => {
        const app_id = el.attribs['data-ds-appid'];
        const title = $('.title', el).text();
        const dateString = $('.search_released', el).text();
        parsed.push({
            app_id,
            title,
            date: moment(dateString, 'll').unix(),
        });
    });
    return parsed;
}
//---creates SteamData Schema
const SteamData = db.define("steamdata", {
    steam_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    app_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    date: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    freezeTableName: true
})
//--creates Ignored Schema
const Ignored = db.define("ignored", {
    ignored_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    steam_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    }
}, {
    freezeTableName: true
})
//--creates MusicURL schema
const MusicUrl = db.define('musicUrl', {
    music_url_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    steam_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    music_url: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    freezeTableName: true
})
//---collects data to be submitted into SteamData Table.
const initialSteamFetch = async () => {
    const htmldata = await getPageData()
    return parseGameRecords(htmldata)
    }

//---main initiates data allocation for SteamData and Initiates Ignored and Music Tables.
const main = async () => {
    try {
        const steamData = await initialSteamFetch()
        // console.log(steamData)
        await db.sync()
        for (let i = 0; i < steamData.length; i++) {
            const item = steamData[i]
            try {
                await SteamData.create({app_id: item.app_id,title: item.title,date: item.date})
                console.log(`added ${item.title}`)
            }
            catch(loopErr){
                if (loopErr.name === `SequelizeUniqueConstraintError`){
                console.log(`${item.title} already exists`)
                } else {
                    throw loopErr
                }
            }
            
        }}
    catch(err){console.log(err)}
    
    // return SteamData.create({appid: steamData.appid,title: steamData.title,date: steamData.date})
}
// ------------ END OF SEQUALIZE INIT-----------

// ------------ ENDPOINT FUNCTIONALITY -----------

// ---fetching table data---
const getSteamData = async (req, res) => {
    console.log('steam data collected')
    await SteamData.findAll({
        attributes: ['steam_id', 'app_id', 'title', 'date']
    })
    .then(dbRes => res.status(200).send(dbRes))
    .catch(err => console.log(err))
}

const getIgnoredData = async (req, res) => {
    console.log('ignored data collected')
    await Ignored.findAll({
        attributes: ['ignored_id', 'steam_id']
    })
    .then(dbRes => res.status(200).send(dbRes))
    .catch(err => console.log(err))
}

const getMusicData = async (req, res) => {
    console.log('music data collected')
     db.query(`
     SELECT sd.steam_id, m.music_url_id, sd.title, m.music_url FROM SteamData sd
     JOIN "musicUrl" m ON m.steam_id = sd.steam_id
     `)
    .then(dbRes => res.status(200).send(dbRes[0]))
    .catch(err => console.log(err))
}
// ---adding to ignored table
const addToIgnored = async (req, res) => {
    const steam_id = req.body.steam_id
    try{
        
        await db.sync()
        await Ignored.create({steam_id: steam_id})
        console.log(`ignored ${steam_id}`)
        res.status(200).json({success: true})
    }
    catch(err){
        if (err.name === `SequelizeUniqueConstraintError`){
        console.log(`${steam_id} already exists`)
        } else {
            throw err
        }
        res.status(400).json({success: false})
    }
}
// ---adding to music table
const addMusicURL = async (req, res) => {
    let steam_id = req.body.steam_id
    let music_url = req.body.music_url
    try {
        await db.sync()
        await MusicUrl.create({steam_id: steam_id, music_url: music_url})
        console.log(`${steam_id} with ${music_url} paired!`)
        res.status(200).json({success: true})
    }
    catch(err){
        if (err.name === `SequelizeUniqueConstraintError`){
        console.log(`${steam_id} already exists`)
        } else {
            throw err
        
        }
        res.status(200).json({success: true})
    }
}
// ---deleting from ignored table
const removeIgnored = async (req, res) => {
    let ignored_id = Number(req.params.id)
    try{
        await db.sync()
        await Ignored.destroy({
            where:{
            ignored_id}
        })
        console.log(`${ignored_id} deleted!`)
        res.status(200).json({success: true})
    }
    catch(err) {console.log(err)}
}

// ---deleting from music table
const removeMusic = (req, res) => {
    let music_url_id = req.params.id
    try{
        db.sync()
        MusicUrl.destroy({
            where:{
            music_url_id}
        })
        console.log(`${music_url_id} deleted!`)
        res.status(200).json({success: true})
    }
    catch(err) {console.log(err)}
}

// ------------ END OF ENDPOINT FUNCTIONALITY ------------
// ----Error handler for all your error handling needs :D ----
const errorHandler = (err, req, res, next) => {
    console.log(`Encountered an unhandled error:`);
    console.log(err);
    if (err) {
      res.json({
        success: false,
        message: `Encountered an error servicing your request.`,
      });
    } else {
      res.json({
        success: false,
        message: `why hello there!`,
      });
    }
  }
// ---Endpoints---
//--debug endpoint, will force main() to run for immediate data collection, not necessary because the server updates daily.
app.get('/api/run-main', main)

//--sends table data to front end
app.get('/api/steam-data', getSteamData)
app.get('/api/ignored-data', getIgnoredData)
app.get('/api/music-url', getMusicData)

//--adds music data and ignored data
app.post('/api/update-ignored', addToIgnored)
app.post('/api/update-url', addMusicURL)

//--deletes music data and ignored data
app.delete('/api/delete-ignored/:id', removeIgnored)
app.delete('/api/delete-music/:id', removeMusic)
// ---Endpoints---


//--Technically endpoints, but needed for heroku and all-in-one setup --
app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, '../client/src/index.html'))
    console.log(" *puts on sunglasses* 'were in' ")
})
app.use('/styles', express.static(path.join(__dirname, '../client/style/style.css')))
app.use('/js', express.static(path.join(__dirname, '../client/src/index.js')))
// app.use('/axios', express.static(path.join(__dirname, '../../node_modules/axios/dist/axios.min.js')))

//
app.use(errorHandler)
// main()
//---so long as the server is running, main will be requested once every 24 hours to fetch new data from steam.
let time = 0
setInterval(() =>{
    time++
    main()
    console.log(`main() loop # ${time}`)
}, 86400000)

const SERVER_PORT = process.env.PORT || 3025

app.listen(SERVER_PORT, () => {
    console.log(`Slamough and Slamstien be Slam-Jamming on ${SERVER_PORT}`)
})