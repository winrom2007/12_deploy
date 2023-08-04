/*global UIkit, Vue */

(() => {
  let client = null;

  const notification = (config) =>
    UIkit.notification({
      pos: "top-right",
      timeout: 5000,
      ...config,
    });

  const alert = (message) =>
    notification({
      message,
      status: "danger",
    });

  const info = (message) =>
    notification({
      message,
      status: "success",
    });

  const fetchJson = (...args) =>
    fetch(...args)
      .then((res) =>
        res.ok
          ? res.status !== 204
            ? res.json()
            : null
          : res.text().then((text) => {
            throw new Error(text);
          })
      )
      .catch((err) => {
        alert(err.message);
      });

  new Vue({
    el: "#app",
    data: {
      desc: "",
      timersAll: [],
      activeTimers: [],
      oldTimers: [],
    },
    methods: {
      createTimer() {
        const description = this.desc;
        this.desc = "";
        fetchJson("/api/timers", {
          method: "post",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description }),
        }).then(({ id }) => {
          info(`Created new timer "${description}" [${id}]`);

          client.send(JSON.stringify({ type: "start", id, description }))
        });
      },
      stopTimer(id) {
        fetchJson(`/api/timers/${id}/stop`, {
          method: "post",
        }).then(() => {
          info(`Stopped the timer [${id}]`);

          client.send(JSON.stringify({ type: "stop", id }))
        });
      },
      formatTime(ts) {
        return new Date(ts).toTimeString().split(" ")[0];
      },
      formatDuration(d) {
        d = Math.floor(d / 1000);
        const s = d % 60;
        d = Math.floor(d / 60);
        const m = d % 60;
        const h = Math.floor(d / 60);
        return [h > 0 ? h : null, m, s]
          .filter((x) => x !== null)
          .map((x) => (x < 10 ? "0" : "") + x)
          .join(":");
      },
    },
    created() {
      const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
      client = new WebSocket(`${wsProto}//${location.host}`);

      client.addEventListener('open', (event) => {
        client.send('Hello Server!');
        client.send(JSON.stringify({ type: "login" }))
      });

      client.addEventListener("message", (message) => {
        let data;
        try {
          data = JSON.parse(message.data);
        } catch (err) {
          return;
        }

        if (data.type === "success_req") {
          console.log(`Message from server ${message.data}`)
        } else if (data.type === "old_timers") {
          this.oldTimers = data.oldTimers;
        } else if (data.type === "all_timers") {
          this.timersAll = data.timersAll;
        } else if (data.type === "timers") {
          this.activeTimers = data.updatedTimers;
        } else if (data.type === "active_timers") {
          this.activeTimers = data.timersActive;
        }
      });
    },
  });
})();
