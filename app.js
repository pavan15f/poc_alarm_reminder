const alarmInput = document.getElementById('alarm-time');
const setButton = document.getElementById('set-reminder');
const clearButton = document.getElementById('clear-reminder');
const statusEl = document.getElementById('status');
const countdownEl = document.getElementById('countdown');

let reminderTimer = null;
let precisionWatcher = null;
let countdownTimer = null;
let reminderAt = null;

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function stopTimers() {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }

  if (precisionWatcher) {
    clearInterval(precisionWatcher);
    precisionWatcher = null;
  }

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function playBeep() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.value = 0.08;

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.4);
}

function fireReminder() {
  stopTimers();

  const message = `Reminder for ${reminderAt.toLocaleString()}`;
  statusEl.textContent = `⏰ Time reached: ${reminderAt.toLocaleString()}`;
  countdownEl.textContent = '';
  clearButton.disabled = true;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Alarm Reminder', { body: message });
  } else {
    alert(message);
  }

  try {
    playBeep();
  } catch {
    // Ignore playback errors (e.g., browser autoplay restrictions).
  }
}

function updateCountdown() {
  if (!reminderAt) {
    countdownEl.textContent = '';
    return;
  }

  const remaining = reminderAt.getTime() - Date.now();
  if (remaining <= 0) {
    fireReminder();
    return;
  }

  countdownEl.textContent = `Time left: ${formatDuration(remaining)}`;
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

async function setReminder() {
  if (!alarmInput.value) {
    statusEl.textContent = 'Please choose a date and time first.';
    return;
  }

  const selected = new Date(alarmInput.value);
  if (Number.isNaN(selected.getTime())) {
    statusEl.textContent = 'The selected time is not valid.';
    return;
  }

  const delay = selected.getTime() - Date.now();
  if (delay <= 0) {
    statusEl.textContent = 'Please select a time in the future.';
    return;
  }

  await ensureNotificationPermission();

  stopTimers();
  reminderAt = selected;

  statusEl.textContent = `Reminder set for ${selected.toLocaleString()}`;
  clearButton.disabled = false;

  reminderTimer = setTimeout(fireReminder, delay);

  // Check every 200ms as a backup for timer drift when tabs are throttled.
  precisionWatcher = setInterval(() => {
    if (reminderAt && Date.now() >= reminderAt.getTime()) {
      fireReminder();
    }
  }, 200);

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function clearReminder() {
  stopTimers();
  reminderAt = null;
  statusEl.textContent = 'Reminder cleared.';
  countdownEl.textContent = '';
  clearButton.disabled = true;
}

setButton.addEventListener('click', setReminder);
clearButton.addEventListener('click', clearReminder);
