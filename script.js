let watchId = null; // watchPositionから得られるIDを格納する変数
let lastSavedTime = Date.now(); // 最後に保存した時刻
let isTracking = false;
let fileHandle;
const sampling_interval = 10 * 1000; // ミリ秒

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
        document.getElementById('altitude').innerText = locationData.alt !== null ? locationData.alt : "N/A";
        document.getElementById('accuracy').innerText = locationData.acc !== null ? locationData.acc : "N/A";
        document.getElementById('altitudeAccuracy').innerText = locationData.altacc !== null ? locationData.altacc : "N/A";
        document.getElementById('heading').innerText = locationData.head !== null ? locationData.head : "N/A";
        document.getElementById('speed').innerText = locationData.spd !== null ? locationData.spd : "N/A";

        // ローカルストレージに保存する前に、以前のデータを配列として取得
        let locations = JSON.parse(localStorage.getItem('locations')) || [];
        locations.push(locationData);
        localStorage.setItem('locations', JSON.stringify(locations));
        lastSavedTime = currentTime;
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
        const filepath = "LocationTracker_" + now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        alert(filepath);

        const textContent = "書き込みたい内容";
        fileHandle = await window.showSaveFilePicker({
            suggestedName: filepath
        });
        await writeFile(fileHandle, textContent);
        console.log('書き込み完了');

        if (navigator.geolocation) {
            // watchPositionメソッドを使用して位置情報の追跡を開始
            watchId = navigator.geolocation.watchPosition(saveLocation, handleError, {
                enableHighAccuracy: true,
                timeout: 100 * 1000,
                maximumAge: 0
            });

            // トラッキング開始時刻を表示
            const now = new Date();
            const formattedTime = now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('trackingStartTime').innerText = `Tracking started at: ${formattedTime}`;

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

    function downloadData() {
        // データのダウンロードを行うコードをここに記述
        console.log("Downloading data...");

        // Retrieve the location data from local storage
        const locations = localStorage.getItem('locations');
        if (locations) {
            // Create a Blob from the data
            const blob = new Blob([locations], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            // Create a link and trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'locations.txt';
            document.body.appendChild(a);
            a.click();

            // Clean up by revoking the Object URL and removing the link
            URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // トラッキング修了時刻を表示
            const now = new Date();
            const formattedTime = now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('trackingEndTime').innerText = `Tracking ended at: ${formattedTime}`;

            document.getElementById('trackingButton').disabled = true;
            // ボタンの表示を元に戻す
            //document.getElementById('trackingButton').innerText = 'Done';
            //isTracking = false;
        } else {
            console.log('No location data to download.');
        }

        // ボタンの表示を元に戻す
        document.getElementById('trackingButton').innerText = 'Start Tracking';
        isTracking = false;
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

async function writeFile(fileHandle, contents) {
    // writable作成
    const writable = await fileHandle.createWritable();

    // コンテンツを書き込む
    await writable.write(contents);

    // ファイル閉じる
    await writable.close();
}