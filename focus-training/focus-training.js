(function () {
  "use strict";

  var statusEl = document.getElementById("ft-status");
  var unavailableEl = document.getElementById("ft-unavailable");
  var boardEl = document.getElementById("ft-board");
  var listEl = document.getElementById("ft-list");
  var emptyEl = document.getElementById("ft-list-empty");
  var listTitleEl = document.getElementById("ft-list-title");
  var testForm = document.getElementById("ft-test-form");
  var testMessage = document.getElementById("ft-test-message");
  var selectedSize = 5;
  var allScores = [];
  var currentUser = null;
  var db = null;

  function setStatus(text) {
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
  }

  function formatTime(seconds) {
    var clamped = Math.max(0, Number(seconds) || 0);
    var minutes = Math.floor(clamped / 60);
    var remainder = clamped - minutes * 60;
    return minutes + ":" + remainder.toFixed(2).padStart(5, "0");
  }

  function renderList() {
    var rows = allScores
      .filter(function (row) {
        return row.gridSize === selectedSize;
      })
      .sort(function (a, b) {
        return a.timeSeconds - b.timeSeconds;
      })
      .slice(0, 25);

    listTitleEl.textContent = selectedSize + "×" + selectedSize;
    listEl.innerHTML = "";
    emptyEl.hidden = rows.length > 0;

    rows.forEach(function (row, index) {
      var item = document.createElement("li");
      item.innerHTML =
        '<span><span class="ft-rank">' +
        (index + 1) +
        "</span> " +
        escapeHtml(row.displayName) +
        "</span><span>" +
        formatTime(row.timeSeconds) +
        "</span>";
      listEl.appendChild(item);
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showUnavailable() {
    setStatus("");
    unavailableEl.hidden = false;
    boardEl.hidden = true;
  }

  function loadScores() {
    return db
      .collection("focusTrainingScores")
      .limit(400)
      .get()
      .then(function (snap) {
        allScores = snap.docs.map(function (doc) {
          var data = doc.data() || {};
          return {
            displayName: data.displayName || "Player",
            gridSize: Number(data.gridSize) || 0,
            timeSeconds: Number(data.timeSeconds) || 0,
          };
        });
        renderList();
      });
  }

  document.querySelectorAll(".ft-tab").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedSize = Number(button.getAttribute("data-size")) || 5;
      document.querySelectorAll(".ft-tab").forEach(function (tab) {
        tab.classList.toggle("is-active", tab === button);
      });
      renderList();
    });
  });

  testForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!currentUser || !db) return;

    var name = (document.getElementById("ft-test-name").value || "").trim().slice(0, 24);
    var timeSeconds = Number(document.getElementById("ft-test-time").value);
    if (!name || !(timeSeconds > 0)) {
      testMessage.textContent = "Enter a name and a time greater than 0.";
      return;
    }

    testMessage.textContent = "Posting…";
    db.collection("focusTrainingScores")
      .add({
        displayName: name,
        gridSize: selectedSize,
        timeSeconds: timeSeconds,
        uid: currentUser.uid,
        source: "web-admin",
        dateKey: new Date().toISOString().slice(0, 10),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(function () {
        testMessage.textContent = "Posted.";
        return loadScores();
      })
      .catch(function (error) {
        testMessage.textContent = error.message || "Could not post that time.";
      });
  });

  if (!window.fsFirebaseConfig || !window.firebase) {
    setStatus("Focus Shift is not configured in this browser.");
    return;
  }

  firebase.initializeApp(window.fsFirebaseConfig);
  db = firebase.firestore();

  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = "/login/?next=/focus-training/";
      return;
    }

    currentUser = user;
    db.collection("users")
      .doc(user.uid)
      .get()
      .then(function (snap) {
        var isAdmin = !!(snap.exists && snap.data() && snap.data().isAdmin === true);
        if (!isAdmin) {
          showUnavailable();
          return;
        }
        unavailableEl.hidden = true;
        boardEl.hidden = false;
        setStatus("");
        return loadScores();
      })
      .catch(function () {
        showUnavailable();
      });
  });
})();
