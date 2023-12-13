let watchId = null; // watchPositionから得られるIDを格納する変数
let lastSavedTime = Date.now(); // 最後に保存した時刻

// 位置情報を取得してローカルストレージに保存する関数
function saveLocation(position) {
    const currentTime = Date.now();
    // 前回の保存から5秒以上経過しているか確認
    if (currentTime - lastSavedTime >= 5000) {
        const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            timestamp: new Date(position.timestamp).toISOString()
        };
        // ローカルストレージに保存する前に、以前のデータを配列として取得
        let locations = JSON.parse(localStorage.getItem('locations')) || [];
        locations.push(locationData);
        localStorage.setItem('locations', JSON.stringify(locations));
        lastSavedTime = currentTime; // 最後に保存した時刻を更新
    }
}

// 位置情報の追跡を開始
function startTracking() {
    if (navigator.geolocation) {
        // watchPositionメソッドを使用して位置情報の追跡を開始
        watchId = navigator.geolocation.watchPosition(saveLocation, handleError, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// 位置情報取得のエラーハンドリング
function handleError(error) {
    console.warn(`ERROR(${error.code}): ${error.message}`);
}

// 位置情報の追跡を停止
function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

// 5秒ごとに位置情報を取得する
setInterval(saveLocation, 5000);

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