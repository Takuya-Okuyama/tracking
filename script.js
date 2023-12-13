let watchId = null; // watchPositionから得られるIDを格納する変数
let lastSavedTime = Date.now(); // 最後に保存した時刻
let isTracking = false;
const sampling_interval = 10 * 1000; // ミリ秒

// データベースの初期設定
let db;
let savefilepath;
const request = indexedDB.open("LocationsDB", 1);

request.onerror = function (event) {
    console.error("Database error: " + event.target.errorCode);
};

request.onsuccess = function (event) {
    db = event.target.result;
};

request.onupgradeneeded = function (event) {
    let db = event.target.result;
    db.createObjectStore("locations", { autoIncrement: true });
};

// 位置情報を取得してローカルストレージに保存する関数
function saveLocation(position) {
    const currentTime = Date.now();

    // 前回の保存から10秒以上経過しているか確認
    if (currentTime - lastSavedTime >= sampling_interval) {
        const locationData = {
            time: new Date(position.timestamp).toISOString(),
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            alt: position.coords.altitude || null,
            acc: position.coords.accuracy || null,
            altacc: position.coords.altitudeAccuracy || null,
            head: position.coords.heading || null,
            spd: position.coords.speed || null
        };

        // テーブルに位置情報を追加
        const now = new Date();
        document.getElementById('timestamp').innerText = now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        document.getElementById('latitude').innerText = locationData.lat;
        document.getElementById('longitude').innerText = locationData.lon;
        document.getElementById('altitude').innerText = locationData.alt !== null ? locationData.alt : 720;
        document.getElementById('accuracy').innerText = locationData.acc !== null ? locationData.acc : 720;
        document.getElementById('altitudeAccuracy').innerText = locationData.altacc !== null ? locationData.altacc : -1;
        document.getElementById('heading').innerText = locationData.head !== null ? locationData.head : -1;
        document.getElementById('speed').innerText = locationData.spd !== null ? locationData.spd : -1;

        // ローカルストレージに保存する前に、以前のデータを配列として取得
        //let locations = JSON.parse(localStorage.getItem('locations')) || [];
        //locations.push(locationData);
        ////localStorage.setItem('locations', JSON.stringify(locations));
        let transaction = db.transaction(["locations"], "readwrite");
        let store = transaction.objectStore("locations");
        store.add(locationData);
    }
}

// 位置情報取得のエラーハンドリング
function handleError(error) {
    alert(`ERROR(${error.code}): ${error.message}`);
}

document.addEventListener('DOMContentLoaded', function () {
    let isTracking = false;

    async function startTracking() {
        // 位置情報の追跡を開始するコードをここに記述
        console.log("Tracking started...");

        // ファイル名
        const now = new Date();
        savefilepath = "LocationTracker_" + now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (navigator.geolocation) {
            // watchPositionメソッドを使用して位置情報の追跡を開始
            watchId = navigator.geolocation.watchPosition(saveLocation, handleError, {
                enableHighAccuracy: true,
                timeout: 100 * 1000,
                maximumAge: 0
            });

            // トラッキング開始時刻を表示
            const now = new Date();
            const strTime = now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('trackingStartTime').innerText = `Tracking started at: ${strTime}`;

            // ボタンの表示を変更
            document.getElementById('trackingButton').innerText = 'Stop Tracking and Save Data';
            isTracking = true;
        } else {
            alert("Geolocation is not supported by this browser.");
        }

        // ボタンの表示を変更
        document.getElementById('trackingButton').innerText = 'Stop Tracking and Save Data';
        isTracking = true;
    }

    async function downloadData() {
        // データのダウンロードを行うコードをここに記述
        console.log("Downloading data...");

        let transaction = db.transaction(["locations"], "readonly");
        let store = transaction.objectStore("locations");
        let request = store.getAll();

        request.onerror = function (event) {
            console.error("Error fetching data: ", event.target.errorCode);
        };

        request.onsuccess = function (event) {
            let data = event.target.result;
            download(JSON.stringify(data, null, 2), savefilepath, "text/plain");
        };

        // トラッキング修了時刻を表示
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        document.getElementById('trackingEndTime').innerText = `Tracking ended at: ${formattedTime}`;

        // ボタンの表示を元に戻す
        document.getElementById('trackingButton').innerText = 'Start Tracking';
        isTracking = false;
    }

    // データをダウンロードするための補助関数
    function download(content, fileName, contentType) {
        let a = document.createElement("a");
        let file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }

    // イベントリスナーを追加
    document.getElementById('trackingButton').addEventListener('click', function () {
        if (isTracking) {
            downloadData();
        } else {
            startTracking();
        }
    });
});
