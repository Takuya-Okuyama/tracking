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

// 最後にデータを保存した時刻
let lastSavedTime = Date.now();

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

// 位置情報を取得してローカルストレージに保存する関数
function saveLocation(position) {
    const currentTime = Date.now();

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

    // ダッシュボードに最新情報を表示
    const now = new Date();
    document.getElementById('timestamp').innerText = now.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    // 緯度、経度、高度などの位置情報を表示
    document.getElementById('latitude').innerText = locationData.lat.toFixed(5);
    document.getElementById('longitude').innerText = locationData.lon.toFixed(5);
    document.getElementById('accuracy').innerText = locationData.acc !== null ? (locationData.acc.toFixed(1) + " m") : "N/A";
    document.getElementById('altitude').innerText = locationData.alt !== null ? (locationData.alt.toFixed(1) + " m") : "N/A";
    document.getElementById('altitudeAccuracy').innerText = locationData.altacc !== null ? (locationData.altacc.toFixed(1) + " m") : "N/A";
    document.getElementById('heading').innerText = locationData.head !== null ? round(locationData.head) : "N/A";
    document.getElementById('speed').innerText = locationData.spd !== null ? (locationData.spd.toFixed(1) + " m/s") : "N/A";

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

    async function startTracking() {
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

    async function downloadData() {
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
