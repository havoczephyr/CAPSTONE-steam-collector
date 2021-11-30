const steamGameSelector = document.getElementById('steam-game-select')
const steamTableContainer = document.querySelector('#steam-data-container')
let cachedSteamTable
let cachedIgnoredTable
let cachedUrl
//Axios endpoints to load cache to memory
//endpoints are loaded seperately to be referenced individually.

const refreshThoseWindows = () => {
    window.location=window.location
}
const getTableData = () => {
    return axios.get('/api/steam-data')
    .then(res => {
        return  res.data
        console.log(res.data)
    })
}
const getIgnoredData = () => {
    return axios.get('/api/ignored-data')
    .then(res => {
        return res.data
        // console.log(res.data)
    })
}
const getURLData = () => {
    return axios.get('/api/music-url')
    .then(res => {
        return res.data
        // console.log(res.data)
    })
}

const pairWithRayConEarBuds = () => {
    let steam_id = document.getElementById('steam-game-select').value
    let music_url = document.getElementById('music-url-input').value
    axios.post('/api/update-url', {steam_id, music_url})
    .then(refreshThoseWindows)
    .catch((err) => console.log(err))
}

const unpairWithRaidShadowLegends = () => {
    let steam_id = document.getElementById('steam-game-select').value
    axios.post('/api/update-ignored', {steam_id})
    .then(refreshThoseWindows)
    .catch((err) => console.log(err))
}
//---activate endpoints--
Promise.all([
    getTableData(),
    getIgnoredData(),
    getURLData(),
])
    .then((results) => {
        const [
            steamTable,
            ignoredTable,
            urlTable
        ] = results;
        console.log(results)

        cachedSteamTable = steamTable;
        cachedIgnoredTable = ignoredTable;
        cachedUrl = urlTable;
        makeSteamDataOptions(cachedSteamTable)
        tableFromJson()
    })



const makeSteamDataOptions = (table) => {
    table.forEach((item, index) => {
        const hasIgnoreEntry = cachedIgnoredTable.find(({ steam_id }) => steam_id === item.steam_id) != null
        const hasUrlEntry = cachedUrl.find(({ steam_id }) => steam_id === item.steam_id) != null
        if (!hasIgnoreEntry && !hasUrlEntry) {
            const option = document.createElement('option')
            option.setAttribute('value', item.steam_id)
            option.textContent = item.title
            steamGameSelector.appendChild(option)

        }
    })
}

    const tableFromJson = () => {
        //credit for this function goes to: https://www.encodedna.com/javascript/practice-ground/default.htm?pg=convert_json_to_table_javascript
        // the json data. (you can change the values for output.)

        // Extract value from table header. 
        const col = ['title', 'music_url'];

        // Create a table.
        const table = document.createElement("table");
        table.id = 'music-table'

        // Create table header row using the extracted headers above.
        let tr = table.insertRow(-1);                   // table row.

        let th
        for (let i = 0; i < col.length; i++) {
            th = document.createElement("th");      // table header.
            th.innerHTML = col[i];
            tr.appendChild(th);
        }
        //add delete column
            th = document.createElement("th");      // table header.
            th.innerHTML = "delete";
            tr.appendChild(th);


        // add json data to the table as rows.
        for (let i = 0; i < cachedUrl.length; i++) {

            tr = table.insertRow(-1);
            let tabCell
            for (let j = 0; j < col.length; j++) {
                tabCell = tr.insertCell(-1);
                tabCell.innerHTML = cachedUrl[i][col[j]];
            }
            
            const music_url_id = cachedUrl[i].music_url_id
            tabCell = tr.insertCell(-1)
            tabCell.innerHTML = '<button onclick="deleteUrlClick(\'' + music_url_id + '\')">x</button>'
        }

        // Now, add the newly created table with json data, to a container.
        var divShowData = document.getElementById('show-data');
        divShowData.innerHTML = "";
        divShowData.appendChild(table);
    }

//an initial load of endpoints are performed on site startup.

function deleteUrlClick(music_url_id){
    axios.delete(`/api/delete-music/${music_url_id}`)
    .then(refreshThoseWindows)
    .catch((err)=> {alert(err.toString())})
}