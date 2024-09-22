function localUpdate(volume = 50, state = "on") {
  try {
    const data = { volume: volume, state: state };

    document.getElementById("volume").innerText = data.volume + "%";
    document.getElementById("state").innerText =
      data.state.charAt(0).toUpperCase() + data.state.slice(1);

    const liquidElement = document.getElementById("liquid");
    liquidElement.style.height = data.volume + "%";
    liquidElement.style.backgroundColor =
      data.state === "on" ? "lightblue" : "gray";
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function fetchData() {
  try {
    const response = await fetch("coap://localhost/ivbag");
    const data = await response.json();

    const volume = data.volume;
    const state = data.state;

    document.getElementById("volume").innerText = volume + "%";
    document.getElementById("state").innerText =
      state.charAt(0).toUpperCase() + state.slice(1);

    const liquidElement = document.getElementById("liquid");
    liquidElement.style.height = volume + "%";
    liquidElement.style.backgroundColor = state === "on" ? "lightblue" : "gray";
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// setInterval(fetchData, 5000);
// fetchData();

// Updated code:

// May Han: using WebSocket to fetch data for real-time updates, cuz HTTP requests may lead to high latency for real-time updates, due to the overhead of establishing a new connection for each request. open for discussion.

const ESP32_IP = "192.168.1.1";
const socket = new WebSocket(`ws://${ESP32_IP}:81/`);

socket.onopen = function (e) {
  console.log("[open] Connection established");
};

socket.onmessage = function (event) {
  console.log(`[message] Data received from server: ${event.data}`);
  const data = JSON.parse(event.data);

  document.getElementById("state").textContent = data.state;
  document.getElementById("volume").textContent = data.volume + "%";
  document.getElementById("rate").textContent = data.flowRate.toFixed(2);

  const liquidElement = document.getElementById("liquid");
  liquidElement.style.height = data.volume + "%";
  liquidElement.style.backgroundColor =
    data.state === "on" ? "lightblue" : "gray";
};

socket.onclose = function (event) {
  if (event.wasClean) {
    console.log(
      `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
    );
  } else {
    console.log("[close] Connection died");
  }
};

socket.onerror = function (error) {
  console.log(`[error] ${error.message}`);
};
