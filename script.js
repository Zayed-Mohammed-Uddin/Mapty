"use strict";

const modal = document.querySelector(".alert");
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

const monthNames = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

class App {
	// stored all workout objects
	_workout;
	_workouts = [];
	_map;
	_mapEvent;
	_type;
	_distance;
	_duration;
	_coords;
	_cadence;
	_elevation;
	_marker;
	date;

	constructor() {
		// getting the position
		this._getPosition();

		// displaying the workouts from local storage
		this._getLocalStorage();

		// event handlers
		form.addEventListener("submit", this._newWorkout.bind(this));
		inputType.addEventListener(
			"change",
			this._toggleElevationField.bind(this)
		);
		containerWorkouts.addEventListener("click", this._moveToMap.bind(this));
	}
	_getPosition() {
		navigator.geolocation.getCurrentPosition(
			this._loadMap.bind(this),
			function () {
				return -1;
			}
		);
	}

	// clear input fields
	_clearInputFields() {
		inputType.value = "running";
		if (inputType.value === "running") {
		}
		inputDistance.value =
			inputDuration.value =
			inputCadence.value =
			inputElevation.value =
				"";
	}

	// Display the modal dialog
	_showModal() {
		if (modal.classList.contains("alert--hidden")) {
			modal.classList.remove("alert--hidden");
		}

		setTimeout(() => {
			modal.classList.add("alert--hidden");
		}, 5000);
		this._clearInputFields();
	}

	// Loading the Map
	_loadMap(position) {
		const { latitude, longitude } = position.coords;
		this._coords = [latitude, longitude];
		this._map = L.map("map").setView(this._coords, 13);
		L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this._map);

		this._map.on("click", this._showForm.bind(this));

		// edit the workout
		containerWorkouts.addEventListener(
			"click",
			this._editWorkout.bind(this)
		);
		// delete the workout
		containerWorkouts.addEventListener(
			"click",
			this._deleteWorkout.bind(this)
		);

		// loading the markers from local storage
		this._workouts.forEach((workout) => {
			this._renderWorkOutMarker(workout);
		});
	}

	_showForm(e) {
		this._mapEvent = e;
		form.classList.toggle("hidden");
		form.classList.toggle("form--transition");
		inputDistance.focus();
	}

	_hideForm() {
		form.classList.toggle("hidden");
		form.classList.toggle("form--transition");
	}

	_toggleElevationField() {
		inputCadence
			.closest(".form__row")
			.classList.toggle("form__row--hidden");
		inputElevation
			.closest(".form__row")
			.classList.toggle("form__row--hidden");
	}
	_newWorkout(e) {
		e.preventDefault();

		// extracting the latitude, and longitude
		const { lat, lng } = this._mapEvent.latlng;

		// Input Validation
		const inputValidation = (...inputs) => {
			return inputs.every((inp) => Number.isFinite(inp) && inp > 0);
		};

		// getting the data
		this._type = inputType.value;
		this._distance = +inputDistance.value;
		this._duration = +inputDuration.value;

		// either - running
		if (this._type === "running") {
			this._cadence = +inputCadence.value;
			if (!inputValidation(this._distance, this._duration, this._cadence))
				return this._showModal();
			this._workout = new Running(
				[lat, lng],
				this._distance,
				this._duration,
				this._cadence
			);
		}
		// or - cycling
		if (this._type === "cycling") {
			this._elevation = +inputElevation.value;
			if (
				!inputValidation(this._distance, this._duration) ||
				!Number.isFinite(this._elevation)
			)
				return this._showModal();
			this._workout = new Cycling(
				[lat, lng],
				this._distance,
				this._duration,
				this._elevation
			);
		}

		// storing the workout in the array
		this._workouts.push(this._workout);
		
		// Render workout (html) on the sidebar
		this._renderWorkout(this._workout);
		
		// Render workout on map as a marker
		this._renderWorkOutMarker(this._workout);

		// Hide the form
		this._hideForm();

		// edit the workout
		containerWorkouts.addEventListener(
			"click",
			this._editWorkout.bind(this)
		);

		// delete the workout
		containerWorkouts.addEventListener(
			"click",
			this._deleteWorkout.bind(this)
		);

		// setting the data to local storage
		this._setLocalStorage();

		// clear input fields
		this._clearInputFields();
	}

	// Rendering the workout
	_renderWorkout(workout) {
		if (!workout) return;
		let html = `
		<li class="workout workout--${workout._type}" data-id=${workout._id}>
          <h2 class="workout__title">${workout.description}</h2>
		  <div class="delete__icon">
		 	<i
			class="fa-solid fa-trash"
			title="Delete"
			></i> 
		  </div>
		  <div class="edit__icon">
				<i
				class="fa-solid fa-pen-to-square"
				title="Edit"></i>
		  </div>	
          <div class="workout__details">
            <span class="workout__icon">${
				workout._type === "running" ? "🏃‍♂️" : "🚴‍♀️"
			}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">KM</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">MIN</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${
				workout._type === "running"
					? workout.pace.toFixed(1)
					: workout.speed.toFixed(1)
			}</span>
            <span class="workout__unit">${
				workout._type === "running" ? "MIN/KM" : "KM/H"
			}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
				workout._type === "running" ? "🦶🏼" : "⛰"
			}</span>
            <span class="workout__value">${
				workout._type === "running"
					? workout.cadence
					: workout.elevation
			}</span>
            <span class="workout__unit">${
				workout._type === "running" ? "SPM" : "M"
			}</span>
          </div>
        </li>`;

		form.insertAdjacentHTML("afterend", html);
	}
	// Display the marker
	_renderWorkOutMarker(workout) {
		if (!workout) return;
		this._marker = L.marker(workout.coords);
		this._marker
			.addTo(this._map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${this._type}-popup`,
				})
			)
			.setPopupContent(
				`${
					workout._type === "running"
						? "🏃‍♂️ ".concat(workout.description)
						: "🚴‍♀️ ".concat(workout.description)
				}`
			)
			.openPopup();
	}
	// Move the map on click4
	_moveToMap(e) {
		const workoutEl = e.target.closest(".workout");
		if (!workoutEl) return;

		const { id } = workoutEl.dataset;
		const targetWorkout = this._workouts.find((work) => work._id === id);

		this._map.setView(targetWorkout.coords, 13, {
			animate: true,
			pan: {
				duration: 1,
			},
		});

		// targetWorkout.click();
	}

	// Edit the workout
	_editWorkout(e) {
		const edit_icon = e.target.closest(".edit__icon");
		if (!edit_icon) return;

		// get the workout id
		const workoutId = e.target.closest(".workout").dataset.id;
		// find the workout in the array
		const workoutObject = this._workouts.find(
			(workout) => workout._id === workoutId
		);
		console.log(workoutId, workoutObject);

		// this._showForm();
	}

	// delete the workout
	_deleteWorkout(e) {
		const delete_icon = e.target.closest(".delete__icon");
		if (!delete_icon) return;

		// get the workout id
		const workoutId = e.target.closest(".workout").dataset.id;
		// find the workout in the array
		const workoutIndex = this._workouts.findIndex(
			(workout) => workout._id === workoutId
		);

		// removing the workout from the array
		this._workouts.splice(workoutIndex, 1);

		// setting the current workouts in the local storage
		this._setLocalStorage();

		// removing the children stacks
		document.querySelectorAll(".workout").forEach((workout) => {
			workout.remove();
		});

		// removing the markups from the map
		if (this._map.hasLayer(this._marker)) {
			this._map.removeLayer(this._marker);
		}

		// rendering the stored workouts
		this._workouts.forEach((workout) => {
			this._renderWorkout(workout);
			this._renderWorkOutMarker(workout);
		});
	}
	// storing the data to local storage
	_setLocalStorage() {
		localStorage.setItem("workouts", JSON.stringify(this._workouts));
	}
	// loading the data from local storage
	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem("workouts"));
		if (!data) return;
		this._workouts = data;

		this._workouts.forEach((workout) => {
			this._renderWorkout(workout);
		});
	}
}

class Workout {
	date = new Date();
	// type = 'cycling';
	_id = String(this.date.getTime()).slice(-10);
	constructor(coords, distance, duration) {
		// this.type = type;
		this.coords = coords;
		this.distance = distance;
		this.duration = duration;
	}
	setDescription() {
		this.description = `${
			this._type[0].toUpperCase() + this._type.slice(1)
		} on ${monthNames[this.date.getMonth()]} ${this.date.getDate()}`;
	}
}

class Cycling extends Workout {
	_type = "cycling";
	constructor(coords, distance, duration, elevation) {
		super(coords, distance, duration);
		// this.type = "cycling";
		this.elevation = elevation;
		this.calcSpeed();
		this.setDescription();
	}
	calcSpeed() {
		this.speed = this.distance / this.duration;
	}
}

class Running extends Workout {
	_type = "running";
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		// this.type = "running";
		this.cadence = cadence;
		this.calcPace();
		this.setDescription();
	}
	calcPace() {
		this.pace = this.duration / this.distance;
	}
}

// init the application
const app = new App();

// local storage has disadvantages ->
// 1. Ability to edit a workout
// 2. Ability to delete a workout
// 3. Ability to delete all workouts
// 4. Ability to sort workouts by distance
