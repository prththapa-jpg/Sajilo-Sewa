// ---------- CONSTANTS ----------
const STORAGE_KEY = "sajilo_user";

const PLACES = [
  { id: "1", name: "New Baneshwor, Kathmandu", latitude: 27.6885, longitude: 85.342 },
  { id: "2", name: "Old Baneshwor, Kathmandu", latitude: 27.6934, longitude: 85.3372 },
  { id: "3", name: "Thamel, Kathmandu", latitude: 27.7149, longitude: 85.3123 },
  { id: "4", name: "Gongabu Bus Park", latitude: 27.7365, longitude: 85.3086 },
  { id: "5", name: "Kalanki, Kathmandu", latitude: 27.6939, longitude: 85.2775 },
  { id: "6", name: "Koteshwor, Kathmandu", latitude: 27.6768, longitude: 85.349 },
  { id: "7", name: "Lalitpur (Jawalakhel)", latitude: 27.6725, longitude: 85.3114 }
];

// ---------- GLOBAL STATE ----------
let currentUser = null;
let currentGender = "Male";
let currentRole = "passenger";
let otpVisible = false;
let termsAccepted = false;

let bookingMap = null;
let statusMap = null;
let ratingMap = null;

let vehicleType = "bike";
let pickupPlace = null;
let destPlace = null;
let distanceKm = 0;
let fareNpr = 0;

let availableDrivers = [];
let selectedDriverId = null;

let currentRide = null;
let rideStage = "on_way"; // on_way, arrived, in_ride
let currentRating = 0;

// ---------- UTILS ----------
function getAgeFromDob(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function haversineDistance(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function showScreen(id) {
  const screens = [
    "screen-login",
    "screen-register",
    "screen-booking",
    "screen-ride-status",
    "screen-rating"
  ];
  screens.forEach((s) => {
    document.getElementById(s).classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");

  if (id === "screen-booking") {
    setTimeout(initBookingMap, 0);
  }
  if (id === "screen-ride-status") {
    setTimeout(initStatusMap, 0);
  }
  if (id === "screen-rating") {
    setTimeout(initRatingMap, 0);
  }
}

function showLogin() {
  showScreen("screen-login");
}

function showRegister() {
  showScreen("screen-register");
}

function showBooking() {
  updateUserChips();
  showScreen("screen-booking");
}

// ---------- LOGIN ----------
function handleLogin() {
  const phoneInput = document.getElementById("login-phone");
  const passInput = document.getElementById("login-password");
  const phone = (phoneInput.value || "").replace(/\D/g, "");
  const password = passInput.value || "";

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    alert("No account found. Please create an account first.");
    return;
  }

  try {
    const user = JSON.parse(saved);
    if (phone === user.phone && password === user.password) {
      currentUser = user;
      showBooking();
    } else {
      alert("Incorrect mobile number or password.");
    }
  } catch (e) {
    console.error(e);
    alert("Something went wrong while logging in.");
  }
}

// ---------- REGISTER ----------
function handleSendOtp() {
  const phoneInput = document.getElementById("reg-phone");
  const phone = (phoneInput.value || "").replace(/\D/g, "");

  if (!phone) {
    alert("Please enter your mobile number first.");
    return;
  }
  if (phone.length !== 10) {
    alert("Mobile number must be exactly 10 digits.");
    return;
  }
  otpVisible = true;
  document.getElementById("otp-section").classList.remove("hidden");
  alert(`OTP has been sent to ${phone}. (Demo only)`);
}

function setGender(gender, el) {
  currentGender = gender;
  document
    .querySelectorAll("[data-gender]")
    .forEach((chip) => chip.classList.remove("active"));
  el.classList.add("active");
}

function setRole(role, el) {
  const dobInput = document.getElementById("reg-dob");
  const dob = dobInput.value;

  if (role === "rider") {
    if (!dob) {
      alert("Please enter your Date of Birth before selecting Rider.");
      return;
    }
    const age = getAgeFromDob(dob);
    if (age === null || age < 18) {
      alert("Rider role requires age 18+.");
      return;
    }
  }

  currentRole = role;
  document
    .querySelectorAll("[data-role]")
    .forEach((chip) => chip.classList.remove("active"));
  el.classList.add("active");

  const riderExtra = document.getElementById("rider-extra");
  if (role === "rider") {
    riderExtra.classList.remove("hidden");
  } else {
    riderExtra.classList.add("hidden");
  }
}

function toggleTerms() {
  termsAccepted = !termsAccepted;
  const box = document.getElementById("terms-box");
  if (termsAccepted) {
    box.classList.add("active");
    box.textContent = "✓";
  } else {
    box.classList.remove("active");
    box.textContent = "";
  }
}

function handleRegister() {
  const fullName = document.getElementById("reg-fullname").value.trim();
  const phoneRaw = document.getElementById("reg-phone").value || "";
  const phone = phoneRaw.replace(/\D/g, "");
  const email = document.getElementById("reg-email").value.trim();
  const dob = document.getElementById("reg-dob").value;
  const licenseNumber = document.getElementById("reg-license").value.trim();
  const bikeNumber = document.getElementById("reg-bike").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm").value;

  if (phone.length !== 10) {
    alert("Mobile number must be exactly 10 digits.");
    return;
  }

  if (!dob) {
    alert("Please enter your Date of Birth.");
    return;
  }

  const age = getAgeFromDob(dob);
  if (age === null || age < 0) {
    alert("Please enter a valid Date of Birth.");
    return;
  }

  if (currentRole === "rider" && age < 18) {
    alert("Rider role requires age 18+.");
    setRole("passenger", document.querySelector('[data-role="passenger"]'));
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (!termsAccepted) {
    alert("You must agree to the Terms and Privacy Policy.");
    return;
  }

  if (currentRole === "rider") {
    if (!licenseNumber) {
      alert("Please enter your License Number.");
      return;
    }
    if (!bikeNumber) {
      alert("Please enter your Bike Number.");
      return;
    }
  }

  if (otpVisible) {
    const code =
      (document.getElementById("otp-1").value || "") +
      (document.getElementById("otp-2").value || "") +
      (document.getElementById("otp-3").value || "") +
      (document.getElementById("otp-4").value || "");
    if (code.length < 4) {
      alert("Please enter the 4-digit OTP.");
      return;
    }
  }

  const user = {
    name: fullName || "Sajilo user",
    phone,
    email,
    gender: currentGender,
    role: currentRole,
    dob,
    age,
    licenseNumber,
    bikeNumber,
    password
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    alert("Account created successfully.");
    currentUser = user;
    showBooking();
  } catch (e) {
    console.error(e);
    alert("Could not save your account.");
  }
}

// ---------- BOOKING MAP & LOGIC ----------
function populatePlaceSelects() {
  const pickupSel = document.getElementById("pickup-select");
  const destSel = document.getElementById("dest-select");
  PLACES.forEach((p) => {
    const opt1 = document.createElement("option");
    opt1.value = p.id;
    opt1.textContent = p.name;
    pickupSel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = p.id;
    opt2.textContent = p.name;
    destSel.appendChild(opt2);
  });
}

function updateUserChips() {
  if (!currentUser) return;
  const initials = (currentUser.name || "U").trim().charAt(0).toUpperCase();
  document.getElementById("booking-avatar").textContent = initials;
  document.getElementById("status-avatar").textContent = initials;
  document.getElementById("rating-avatar").textContent = initials;

  document.getElementById("booking-username").textContent =
    currentUser.name || "User";
  document.getElementById("status-username").textContent =
    currentUser.name || "User";
  document.getElementById("rating-username").textContent =
    currentUser.name || "User";
}

function initBookingMap() {
  if (bookingMap) {
    bookingMap.invalidateSize();
    return;
  }
  bookingMap = L.map("booking-map").setView([27.7172, 85.324], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(bookingMap);

  // Try to use geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        bookingMap.setView([pos.coords.latitude, pos.coords.longitude], 14);
      },
      () => {
        // ignore error
      }
    );
  }

  document.getElementById("pickup-select").addEventListener("change", () => {
    const id = document.getElementById("pickup-select").value;
    pickupPlace = PLACES.find((p) => p.id === id) || null;
    refreshBookingMarkers();
  });

  document.getElementById("dest-select").addEventListener("change", () => {
    const id = document.getElementById("dest-select").value;
    destPlace = PLACES.find((p) => p.id === id) || null;
    refreshBookingMarkers();
  });
}

let pickupMarker = null;
let destMarker = null;

function refreshBookingMarkers() {
  if (!bookingMap) return;

  if (pickupMarker) bookingMap.removeLayer(pickupMarker);
  if (destMarker) bookingMap.removeLayer(destMarker);

  if (pickupPlace) {
    pickupMarker = L.marker([pickupPlace.latitude, pickupPlace.longitude], {
      title: "Pickup"
    }).addTo(bookingMap);
    pickupMarker.bindPopup("Pickup: " + pickupPlace.name);
  }

  if (destPlace) {
    destMarker = L.marker([destPlace.latitude, destPlace.longitude], {
      title: "Destination"
    }).addTo(bookingMap);
    destMarker.bindPopup("Destination: " + destPlace.name);
  }

  if (pickupPlace && destPlace) {
    const latMid = (pickupPlace.latitude + destPlace.latitude) / 2;
    const lonMid = (pickupPlace.longitude + destPlace.longitude) / 2;
    bookingMap.setView([latMid, lonMid], 13);
  } else if (pickupPlace) {
    bookingMap.setView([pickupPlace.latitude, pickupPlace.longitude], 14);
  } else if (destPlace) {
    bookingMap.setView([destPlace.latitude, destPlace.longitude], 14);
  }

  updateDistanceAndFare();
}

function updateDistanceAndFare() {
  const pickupCoord = pickupPlace
    ? { latitude: pickupPlace.latitude, longitude: pickupPlace.longitude }
    : null;
  const destCoord = destPlace
    ? { latitude: destPlace.latitude, longitude: destPlace.longitude }
    : null;

  const summaryPickup = document.getElementById("summary-pickup");
  const summaryDest = document.getElementById("summary-dest");
  const summaryDistance = document.getElementById("summary-distance");
  const summaryFare = document.getElementById("summary-fare");

  summaryPickup.textContent = pickupPlace ? pickupPlace.name : "Not set";
  summaryDest.textContent = destPlace ? destPlace.name : "Not set";

  if (pickupCoord && destCoord) {
    distanceKm = haversineDistance(pickupCoord, destCoord);
    summaryDistance.textContent = distanceKm.toFixed(2) + " km";

    const baseBike = 30;
    const perKmBike = 25;
    const baseTaxi = 50;
    const perKmTaxi = 40;

    if (vehicleType === "bike") {
      fareNpr = Math.round(baseBike + distanceKm * perKmBike);
    } else {
      fareNpr = Math.round(baseTaxi + distanceKm * perKmTaxi);
    }
    summaryFare.textContent = "NPR " + fareNpr;
  } else {
    distanceKm = 0;
    fareNpr = 0;
    summaryDistance.textContent = "—";
    summaryFare.textContent = "";
  }

  availableDrivers = [];
  selectedDriverId = null;
  renderDrivers();
}

function resetBooking() {
  pickupPlace = null;
  destPlace = null;
  distanceKm = 0;
  fareNpr = 0;
  availableDrivers = [];
  selectedDriverId = null;

  document.getElementById("pickup-select").value = "";
  document.getElementById("dest-select").value = "";
  document.getElementById("summary-pickup").textContent = "Not set";
  document.getElementById("summary-dest").textContent = "Not set";
  document.getElementById("summary-distance").textContent = "—";
  document.getElementById("summary-fare").textContent = "";

  if (pickupMarker) bookingMap.removeLayer(pickupMarker);
  if (destMarker) bookingMap.removeLayer(destMarker);
  pickupMarker = null;
  destMarker = null;

  renderDrivers();
}

function setVehicleType(type, el) {
  vehicleType = type;
  document
    .querySelectorAll("[data-vtype]")
    .forEach((chip) => chip.classList.remove("active"));
  el.classList.add("active");
  updateDistanceAndFare();
}

function searchDrivers() {
  if (!pickupPlace || !destPlace) {
    alert("Please select both Pickup and Destination.");
    return;
  }
  if (distanceKm <= 0) {
    alert("Could not calculate distance.");
    return;
  }

  const btn = document.getElementById("search-driver-btn");
  btn.disabled = true;
  btn.textContent = "Searching…";

  setTimeout(() => {
    const pickupCoord = {
      latitude: pickupPlace.latitude,
      longitude: pickupPlace.longitude
    };

    const names =
      vehicleType === "bike"
        ? ["Ramesh", "Sita", "Dinesh"]
        : ["Kiran", "Bimal", "Anita"];
    const vehicles =
      vehicleType === "bike"
        ? ["Pulsar 150", "Scooter", "Apache 160"]
        : ["Hyundai i10", "Suzuki Alto", "Tata Indica"];

    availableDrivers = names.map((name, idx) => {
      const offsetLat = (Math.random() - 0.5) * 0.01;
      const offsetLng = (Math.random() - 0.5) * 0.01;
      const coord = {
        latitude: pickupCoord.latitude + offsetLat,
        longitude: pickupCoord.longitude + offsetLng
      };
      const distFromPickup = haversineDistance(pickupCoord, coord);
      const eta = Math.max(2, Math.round(distFromPickup * 4) + 2);
      return {
        id: Date.now() + "-" + idx,
        name,
        vehicle: vehicles[idx],
        eta,
        coord,
        distanceFromPickup: distFromPickup
      };
    });

    selectedDriverId = null;
    renderDrivers();

    btn.disabled = false;
    btn.textContent = "Search for driver";
  }, 1000);
}

function renderDrivers() {
  const box = document.getElementById("driver-box");
  const list = document.getElementById("driver-list");
  const confirmBtn = document.getElementById("confirm-ride-btn");

  list.innerHTML = "";
  if (!availableDrivers.length) {
    box.classList.add("hidden");
    confirmBtn.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");

  availableDrivers.forEach((d) => {
    const row = document.createElement("div");
    row.className =
      "driver-row" + (d.id === selectedDriverId ? " selected" : "");
    row.onclick = () => {
      selectedDriverId = d.id;
      renderDrivers();
      confirmBtn.classList.remove("hidden");
    };

    const main = document.createElement("div");
    main.className = "driver-main";
    main.textContent = `${d.name} • ${d.vehicle}`;

    const sub = document.createElement("div");
    sub.className = "driver-sub";
    sub.textContent = `${d.distanceFromPickup.toFixed(
      2
    )} km from pickup • ETA ${d.eta} min`;

    row.appendChild(main);
    row.appendChild(sub);
    list.appendChild(row);
  });

  confirmBtn.classList.toggle("hidden", !selectedDriverId);
}

function confirmRide() {
  if (!availableDrivers.length) {
    alert("Please search for drivers first.");
    return;
  }
  const driver = availableDrivers.find((d) => d.id === selectedDriverId);
  if (!driver) {
    alert("Please select a driver.");
    return;
  }

  currentRide = {
    driver,
    vehicleType,
    pickupLabel: pickupPlace.name,
    destLabel: destPlace.name,
    distanceKm,
    fare: fareNpr,
    pickupCoord: {
      latitude: pickupPlace.latitude,
      longitude: pickupPlace.longitude
    },
    destCoord: {
      latitude: destPlace.latitude,
      longitude: destPlace.longitude
    }
  };

  rideStage = "on_way";
  showRideStatus();
}

// ---------- RIDE STATUS ----------
function initStatusMap() {
  if (!statusMap) {
    statusMap = L.map("status-map").setView([27.7172, 85.324], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(statusMap);
  }
  refreshStatusMap();
}

let statusPickupMarker = null;
let statusDestMarker = null;
let statusDriverMarker = null;

function refreshStatusMap() {
  if (!statusMap || !currentRide) return;

  [statusPickupMarker, statusDestMarker, statusDriverMarker].forEach((m) => {
    if (m) statusMap.removeLayer(m);
  });

  const { driver, pickupCoord, destCoord } = currentRide;

  if (pickupCoord) {
    statusPickupMarker = L.marker(
      [pickupCoord.latitude, pickupCoord.longitude],
      { title: "Pickup" }
    ).addTo(statusMap);
    statusPickupMarker.bindPopup("Pickup: " + currentRide.pickupLabel);
  }

  if (destCoord) {
    statusDestMarker = L.marker(
      [destCoord.latitude, destCoord.longitude],
      { title: "Destination" }
    ).addTo(statusMap);
    statusDestMarker.bindPopup("Destination: " + currentRide.destLabel);
  }

  statusDriverMarker = L.marker(
    [driver.coord.latitude, driver.coord.longitude],
    { title: "Driver" }
  ).addTo(statusMap);
  statusDriverMarker.bindPopup(
    `Driver: ${driver.name} (${driver.vehicle})`
  );

  const bounds = [];
  if (pickupCoord) bounds.push([pickupCoord.latitude, pickupCoord.longitude]);
  if (destCoord) bounds.push([destCoord.latitude, destCoord.longitude]);
  bounds.push([driver.coord.latitude, driver.coord.longitude]);

  if (bounds.length > 1) {
    statusMap.fitBounds(bounds, { padding: [40, 40] });
  } else {
    statusMap.setView(bounds[0] || [27.7172, 85.324], 13);
  }
}

function showRideStatus() {
  if (!currentRide) return;

  showScreen("screen-ride-status");
  updateUserChips();

  const driver = currentRide.driver;
  let title = "Driver on the way";
  let message = `${driver.name} will arrive in ${driver.eta} minutes.`;
  let primaryLabel = "Driver has arrived (demo)";

  if (rideStage === "arrived") {
    title = "Driver has arrived";
    message = "Please meet your driver at the pickup point.";
    primaryLabel = "Start ride";
  } else if (rideStage === "in_ride") {
    title = "Ride in progress";
    message = "You are on the way to your destination.";
    primaryLabel = "End ride";
  }

  document.getElementById("status-title").textContent = title;
  document.getElementById("status-text").textContent = message;
  document.getElementById("status-route").textContent =
    `Pickup: ${currentRide.pickupLabel}\nDestination: ${currentRide.destLabel}`;
  document.getElementById("status-distance").textContent =
    "Trip distance: " + currentRide.distanceKm.toFixed(2) + " km";
  document.getElementById("status-fare").textContent =
    "NPR " + currentRide.fare;
  document.getElementById("status-primary-btn").textContent = primaryLabel;

  const cancelBtn = document.getElementById("status-cancel-btn");
  if (rideStage === "in_ride") {
    cancelBtn.style.display = "none";
  } else {
    cancelBtn.style.display = "inline";
  }

  setTimeout(refreshStatusMap, 50);
}

function statusPrimaryAction() {
  if (!currentRide) return;

  if (rideStage === "on_way") {
    rideStage = "arrived";
    showRideStatus();
  } else if (rideStage === "arrived") {
    rideStage = "in_ride";
    showRideStatus();
  } else if (rideStage === "in_ride") {
    showRating();
  }
}

function cancelRide() {
  if (!confirm("Cancel the ride?")) return;
  currentRide = null;
  availableDrivers = [];
  selectedDriverId = null;
  resetBooking();
  showBooking();
}

// ---------- RATING ----------
function initRatingMap() {
  if (!ratingMap) {
    ratingMap = L.map("rating-map").setView([27.7172, 85.324], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(ratingMap);
  }
  refreshRatingMap();
}

let ratingPickupMarker = null;
let ratingDestMarker = null;
let ratingDriverMarker = null;

function refreshRatingMap() {
  if (!ratingMap || !currentRide) return;

  [ratingPickupMarker, ratingDestMarker, ratingDriverMarker].forEach((m) => {
    if (m) ratingMap.removeLayer(m);
  });

  const { driver, pickupCoord, destCoord } = currentRide;

  if (pickupCoord) {
    ratingPickupMarker = L.marker(
      [pickupCoord.latitude, pickupCoord.longitude],
      { title: "Pickup" }
    ).addTo(ratingMap);
    ratingPickupMarker.bindPopup("Pickup: " + currentRide.pickupLabel);
  }

  if (destCoord) {
    ratingDestMarker = L.marker(
      [destCoord.latitude, destCoord.longitude],
      { title: "Destination" }
    ).addTo(ratingMap);
    ratingDestMarker.bindPopup("Destination: " + currentRide.destLabel);
  }

  ratingDriverMarker = L.marker(
    [driver.coord.latitude, driver.coord.longitude],
    { title: "Driver" }
  ).addTo(ratingMap);
  ratingDriverMarker.bindPopup(
    `Driver: ${driver.name} (${driver.vehicle})`
  );

  const bounds = [];
  if (pickupCoord) bounds.push([pickupCoord.latitude, pickupCoord.longitude]);
  if (destCoord) bounds.push([destCoord.latitude, destCoord.longitude]);
  bounds.push([driver.coord.latitude, driver.coord.longitude]);

  if (bounds.length > 1) {
    ratingMap.fitBounds(bounds, { padding: [40, 40] });
  } else {
    ratingMap.setView(bounds[0] || [27.7172, 85.324], 13);
  }
}

function showRating() {
  if (!currentRide) return;

  showScreen("screen-rating");
  updateUserChips();

  const driver = currentRide.driver;
  document.getElementById("rating-driver").textContent =
    `${driver.name} • ${driver.vehicle}`;
  document.getElementById("rating-trip").textContent =
    `${currentRide.pickupLabel} → ${currentRide.destLabel}\n` +
    `Distance: ${currentRide.distanceKm.toFixed(
      2
    )} km • Fare: NPR ${currentRide.fare}`;

  currentRating = 0;
  document.getElementById("rating-comment").value = "";
  updateStars();

  setTimeout(refreshRatingMap, 50);
}

function setRating(stars) {
  currentRating = stars;
  updateStars();
}

function updateStars() {
  document.querySelectorAll(".star").forEach((el) => {
    const starVal = parseInt(el.getAttribute("data-star"), 10);
    if (starVal <= currentRating) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
}

function submitRating() {
  if (currentRating === 0) {
    alert("Please tap a star to rate your driver.");
    return;
  }
  const comment = document.getElementById("rating-comment").value.trim();
  alert(
    `Thanks! You rated ${currentRide.driver.name} ${currentRating} star(s).\n(Comment: ${
      comment || "No comment"
    })\n\nDemo only – not saved anywhere.`
  );
  currentRide = null;
  availableDrivers = [];
  selectedDriverId = null;
  resetBooking();
  showBooking();
}

// ---------- LOGOUT ----------
function logout() {
  currentUser = null;
  showLogin();
}

// ---------- INIT ----------
function init() {
  populatePlaceSelects();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      currentUser = JSON.parse(saved);
    }
  } catch {}

  if (currentUser) {
    showBooking();
  } else {
    showLogin();
  }
}

document.addEventListener("DOMContentLoaded", init);
