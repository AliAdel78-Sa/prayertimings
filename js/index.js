// Importing DOM Elements
import * as elements from "./elements.js";

// Translate Function
async function translate(text, from, to) {
	try {
		const res = await fetch(
			`https://api.mymemory.translated.net/get?q=${text}&langpair=${from}|${to}`
		);
		const data = await res.json();
		return data.matches[0].translation;
	} catch (error) {
		console.error(error);
	}
}

// Getting Date For The Api
function getDate() {
	const today = new Date();
	const tomorrow = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate() + 1,
		today.getHours(),
		today.getMinutes(),
		today.getSeconds(),
		today.getMilliseconds()
	);
	return [today, tomorrow];
}

// Format Date In DD-MM-YYYY For The API
function formatDate(date) {
	const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
		date.getMonth() + 1
	).padStart(2, "0")}-${String(date.getFullYear()).padStart(2, "0")}`;
	return formattedDate;
}

// Get The Latitude & Longitude Of The User
function getLocation() {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const latitude = position.coords.latitude;
				const longitude = position.coords.longitude;
				resolve([latitude, longitude]);
			},
			(error) => {
				reject(error);
			}
		);
	});
}

// Fetching The Prayer Times Api
async function fetchPrayerApi() {
	try {
		// Getting Data For Query Params
		const [today, tomorrow] = getDate();
		// const [latitude, longitude] = await getLocation();
		// Fetching API
		const todayRes = await fetch(
			`https://api.aladhan.com/v1/timings/${formatDate(
				today
			)}?latitude=${30}&longitude=${31}`
		);
		const tomorrowRes = await fetch(
			`https://api.aladhan.com/v1/timings/${formatDate(
				tomorrow
			)}?latitude=${30}&longitude=${31}`
		);
		// Converting Data From JSON To JS Objects
		const todayData = await todayRes.json();
		const tomorrowData = await tomorrowRes.json();
		const timezone = todayData.data.meta.timezone.split("/")[1];
		const translatedTimeZone = await translate(timezone, "en-GB", "ar-SA");

		elements.city.innerHTML = translatedTimeZone || "Unknown";
		// Return Data
		return new Promise((resolve) => {
			const todayTimings = todayData.data.timings;
			const tomorrowTimings = tomorrowData.data.timings;
			resolve([todayTimings, tomorrowTimings]);
		});
	} catch (error) {
		console.error(error);
	}
}

/**
 * Fetches and displays prayer times.
 * - Calls the API to fetch prayer timings for today and tomorrow.
 * - Passes the fetched data to the `renderPrayerTimes` function for processing and UI updates.
 * - Logs success or failure messages to the console.
 */
async function displayPrayerTimes() {
	try {
		const [todayTimings, tomorrowTimings] = await fetchPrayerApi();
		renderPrayerTimes(todayTimings, tomorrowTimings);
		console.log("FETCHED API SUCCESSFULLY");
	} catch (e) {
		console.error(e);
	}
}

/**
 * Renders prayer times for today and tomorrow.
 * - Organizes prayer timings in the correct order.
 * - Updates the UI with formatted prayer times for today.
 * - Converts prayer timings to Unix timestamps for easier comparisons.
 * - Sets up a countdown timer for the next prayer.
 *
 * @param {Object} todayTimings - Prayer timings for today.
 * @param {Object} tomorrowTimings - Prayer timings for tomorrow.
 */
function renderPrayerTimes(todayTimings, tomorrowTimings) {
	const [today, tomorrow] = getDate();
	todayTimings = organizePrayerTimings(todayTimings);
	tomorrowTimings = organizePrayerTimings(tomorrowTimings);
	updateUi(todayTimings);
	todayTimings = convertToUnixTimestamps(todayTimings, today);
	tomorrowTimings = convertToUnixTimestamps(tomorrowTimings, tomorrow);
	const combinedDays = [...todayTimings, ...tomorrowTimings];
	for (let i = 0; i < combinedDays.length; i++) {
		const timing = combinedDays[i];
		if (Date.now() < timing.time) {
			setUpTimer(timing);
			break;
		}
	}
}
// Calculating The Remaining Time For The Next Prayer And Displaying That
function setUpTimer(timing) {
	setInterval(() => {
		let elapsedTime = timing.time - Date.now();
		if (elapsedTime <= 0) {
			displayPrayerTimes();
			return;
		}
		if (timing.title === "منتصف الليل") {
			elements.nextPrayer.innerHTML = `المتبقي ل${timing.title}`;
		} else {
			elements.nextPrayer.innerHTML = `المتبقي لل${timing.title}`;
		}
		elements.timer.innerHTML = `${formatTime(elapsedTime)}`;
		elements.loader.classList.remove("show");
	}, 1000);
}

// Updating The UI With The Prayer Times
function updateUi(todayTimings) {
	for (let i = 0; i < todayTimings.length; i++) {
		const timing = todayTimings[i].time;
		const hours = formatHours(Number(timing.split(":")[0]));
		const minutes = Number(timing.split(":")[1]);
		const time = `${addZero(hours)}:${addZero(minutes)}`;
		const title = todayTimings[i].title;
		const period = Number(timing.split(":")[0]) > 12 ? "PM" : "AM";

		if (title !== "منتصف الليل") {
			elements.allPrayerNames[i].innerHTML = `ال${title}`;
			elements.allPrayerTimes[i].innerHTML = `${time} ${period}`;
		} else {
			elements.allPrayerNames[i].innerHTML = `${title}`;
			elements.allPrayerTimes[i].innerHTML = `${time} ${period}`;
		}
	}
}

// Organizing Prayers Times In Ascending Order
function organizePrayerTimings(timings) {
	const {
		Fajr,
		Sunrise,
		Dhuhr,
		Asr,
		Sunset,
		Maghrib,
		Isha,
		Imsak,
		Midnight,
		Firstthird,
		Lastthird,
	} = timings;
	if (Number(Midnight.split(":")[0]) === 0) {
		const newTimings = [
			{ time: Midnight, title: "منتصف الليل" },
			{ time: Lastthird, title: "ثلث الليل الأخر" },
			{ time: Fajr, title: "فجر" },
			{ time: Sunrise, title: "شروق" },
			{ time: Dhuhr, title: "ظهر" },
			{ time: Asr, title: "عصر" },
			{ time: Maghrib, title: "مغرب" },
			{ time: Isha, title: "عشاء" },
		];
		return newTimings;
	} else {
		const newTimings = [
			{ time: Lastthird, title: "ثلث الليل الأخر" },
			{ time: Fajr, title: "فجر" },
			{ time: Sunrise, title: "شروق" },
			{ time: Dhuhr, title: "ظهر" },
			{ time: Asr, title: "عصر" },
			{ time: Maghrib, title: "مغرب" },
			{ time: Isha, title: "عشاء" },
			{ time: Midnight, title: "منتصف الليل" },
		];
		return newTimings;
	}
}

// Converts prayer timings to Unix timestamps for easier time comparison
function convertToUnixTimestamps(timings, date) {
	timings = timings.map((time) => {
		const hours = time.time.split(":")[0];
		const mins = time.time.split(":")[1];
		const prayerTime = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			hours,
			mins
		);
		return { time: prayerTime.getTime(), title: time.title };
	});
	return timings;
}

// Format Time From Milliseconds Into A Readable Format
function formatTime(ms) {
	const totalSeconds = ms / 1000;
	const hr = Math.floor(totalSeconds / 3600);
	const min = Math.floor((totalSeconds % 3600) / 60);
	const sec = Math.floor(totalSeconds % 60);
	return `${addZero(hr)}:${addZero(min)}:${addZero(sec)}`;
}

// Changing Hours From 24-hours base To 12-hours base
function formatHours(hr) {
	return hr % 12 || 12;
}

// Adding Zero To The Beginning Of The Number If Its 10 or more (i.e. Two Digits)
function addZero(n) {
	return String(n).padStart(2, "0");
}

// Updating New Prayer Times
function scheduleMidnightUpdate() {
	const now = new Date();
	const nextMidnight = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
		0,
		0,
		0
	);
	const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
	setTimeout(() => {
		displayPrayerTimes(); // Update prayer times at midnight
		scheduleMidnightUpdate(); // Schedule the next update
	}, timeUntilMidnight);
}

// Initial Functions

scheduleMidnightUpdate();
displayPrayerTimes();
