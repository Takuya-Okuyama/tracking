let watchId = null; // watchPositionから得られるIDを格納する変数
let lastSavedTime = Date.now(); // 最後に保存した時刻

// 位置情報を取得してローカルストレージに保存する関数
function saveLocation(position) {
    const currentTime = Date.now();

    // 前回の保存から2秒以上経過しているか確認
    if (currentTime - lastSavedTime >= 2000) {
        const locationData = {
            timestamp: new Date(position.timestamp).toISOString(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || null,
            accuracy: position.coords.accuracy || null,
            //altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading || null,
            speed: position.coords.speed || null
        };

        // テーブルに位置情報を追加
        const row = document.getElementById("locationTable").insertRow(-1);
        row.insertCell(0).innerHTML = locationData.timestamp;
        row.insertCell(1).innerHTML = locationData.latitude;
        row.insertCell(2).innerHTML = locationData.longitude;
        row.insertCell(3).innerHTML = locationData.altitude !== null ? locationData.altitude : "N/A";
        row.insertCell(4).innerHTML = locationData.accuracy !== null ? locationData.accuracy : "N/A";
        row.insertCell(5).innerHTML = locationData.heading !== null ? locationData.heading : "N/A";
        row.insertCell(6).innerHTML = locationData.speed !== null ? locationData.speed : "N/A";

        // ローカルストレージに保存する前に、以前のデータを配列として取得
        let locations = JSON.parse(localStorage.getItem('locations')) || [];
        locations.push(locationData);
        localStorage.setItem('locations', JSON.stringify(locations));
        lastSavedTime = currentTime;
    }
}

// 位置情報の追跡を開始
function startTracking() {
    if (navigator.geolocation) {
        // watchPositionメソッドを使用して位置情報の追跡を開始
        watchId = navigator.geolocation.watchPosition(saveLocation, handleError, {
            enableHighAccuracy: true,
            timeout: 100000,
            maximumAge: 0
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// 位置情報取得のエラーハンドリング
function handleError(error) {
    alert(`ERROR(${error.code}): ${error.message}`);
}

// 位置情報の追跡を停止
function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

function downloadData() {
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
    } else {
        console.log('No location data to download.');
    }
}