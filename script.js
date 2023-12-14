if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('service_worker.js').then(function (registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// IDを格納するための変数、watchPosition関数から得られる
let watchId = null;

// 最後にデータを保存した時刻として、UNIXエポック時間の開始点を指定する
let lastSavedTime = Date(0);
let previousTime = Date(0);
let previousLat = null;
let previousLon = null;

// トラッキングの状態（開始/停止）
let isTracking = false;

// ダウンロード先のファイル名
let saveFilePath;

// サンプリング間隔をミリ秒単位で設定
const sampling_interval = 10 * 1000;

// IndexedDBデータベースへの接続リクエスト
let db;
const dbRequest = indexedDB.open("LocationsDB", 1);

dbRequest.onerror = function (event) {
    // データベース接続エラー時の処理
    console.error("Database error: " + event.target.errorCode);
};

dbRequest.onsuccess = function (event) {
    // データベース接続成功時の処理
    db = event.target.result;
};

dbRequest.onupgradeneeded = function (event) {
    // データベースのセットアップやアップグレードが必要な場合の処理
    let db = event.target.result;
    if (!db.objectStoreNames.contains("locations")) {
        db.createObjectStore("locations", { autoIncrement: true });
    }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371e3; // 地球の半径 (メートル)
    var φ1 = lat1 * Math.PI/180; // 緯度1のラジアン値
    var φ2 = lat2 * Math.PI/180; // 緯度2のラジアン値
    var Δφ = (lat2-lat1) * Math.PI/180; // 緯度差のラジアン値
    var Δλ = (lon2-lon1) * Math.PI/180; // 経度差のラジアン値

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    var distance = R * c; // 結果 (メートル)
    return distance;
}

// 位置情報を取得してローカルストレージに保存する関数
function saveLocation(position) {
    const currentTime = new Date(position.timestamp);

    const locationData = {
        time: currentTime.toISOString(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude || null,
        accuracy: position.coords.accuracy || null,
        altitudeAccuracy: position.coords.altitudeAccuracy || null,
        heading: position.coords.heading || null,
        speed: position.coords.speed || null
    };

    // 移動距離と移動時間から、移動速度を算出
    let estimated_speed = null;
    if (previousLat != null && previousLon != null && locationData.latitude != null && locationData.longitude != null) {
        let elapsed_time = (currentTime - previousTime) / 3600000; // hour
        let distance = calculateDistance(previousLat, previousLon, locationData.latitude, locationData.longitude) * 1e-3; // km
        estimated_speed = distance / elapsed_time;
    }

    // 速度計算用のデータを更新
    previousTime = currentTime;
    previousLat = locationData.latitude;
    previousLon = locationData.longitude;

    // ダッシュボードに最新情報を表示
    document.getElementById('timestamp').innerText = currentTime.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    document.getElementById('latitude').innerText = locationData.latitude.toFixed(5);
    document.getElementById('longitude').innerText = locationData.longitude.toFixed(5);
    document.getElementById('accuracy').innerText = locationData.accuracy !== null ? (locationData.accuracy.toFixed(1) + " m") : "N/A";
    document.getElementById('altitude').innerText = locationData.altitude !== null ? (locationData.altitude.toFixed(1) + " m") : "N/A";
    document.getElementById('altitudeAccuracy').innerText = locationData.altitudeAccuracy !== null ? (locationData.altitudeAccuracy.toFixed(1) + " m") : "N/A";
    document.getElementById('heading').innerText = locationData.heading !== null ? round(locationData.heading) : "N/A";
    document.getElementById('speed').innerText = locationData.speed !== null ? (locationData.speed.toFixed(1) + " m/s") : "N/A";
    document.getElementById('estimated_speed').innerText = estimated_speed !== null ? (estimated_speed.toFixed(1) + " kph") : "0.0 kph";

    // 前回の保存から10秒以上経過しているか確認
    if (currentTime - lastSavedTime >= sampling_interval) {
        let transaction = db.transaction(["locations"], "readwrite");
        let store = transaction.objectStore("locations");
        store.add(locationData);

        lastSavedTime = currentTime;
    }
}

// 位置情報取得のエラーハンドリング
function handleError(error) {
    alert(`ERROR(${error.code}): ${error.message}`);
}

document.addEventListener('DOMContentLoaded', function () {
    let isTracking = false;

    function startTracking() {
        // ファイル名
        const now = new Date();
        saveFilePath = "LocationTracker_" + now.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        if (navigator.geolocation) {
            // watchPositionメソッドを使用して位置情報の追跡を開始
            watchId = navigator.geolocation.watchPosition(saveLocation, handleError, {
                enableHighAccuracy: true,
                timeout: 100 * 1000,
                maximumAge: 0
            });

            // トラッキング開始時刻を表示
            const now = new Date();
            const strTime = now.toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
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

    function downloadData() {
        let transaction = db.transaction(["locations"], "readonly");
        let store = transaction.objectStore("locations");
        let request = store.getAll();

        request.onerror = function (event) {
            console.error("Error fetching data: ", event.target.errorCode);
        };

        request.onsuccess = function (event) {
            let data = event.target.result;
            download(JSON.stringify(data, null, 2), saveFilePath, "text/plain");
        };

        // トラッキング修了時刻を表示
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
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
