function formatDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function todayKey() {
  return formatDate(new Date());
}

function getSecondsSinceMidnight(d = new Date()) {
  const date = new Date(d);
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

module.exports = {
  formatDate,
  todayKey,
  getSecondsSinceMidnight
};
