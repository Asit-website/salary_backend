const { AppSetting } = require('../models');

function coerceSalarySettings(input) {
  const def = {
    payableDaysMode: "calendar_month",
    weeklyOffs: [0], // 0 = Sunday ... 6 = Saturday
    hoursPerDay: 8,
  };
  const modes = [
    "calendar_month",
    "every_30",
    "every_28",
    "every_26",
    "exclude_weekly_offs",
  ];
  const mode =
    input?.payableDaysMode && modes.includes(String(input.payableDaysMode))
      ? String(input.payableDaysMode)
      : def.payableDaysMode;

  let weeklyOffs = Array.isArray(input?.weeklyOffs)
    ? input.weeklyOffs.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : def.weeklyOffs;
  if (weeklyOffs.length === 0) weeklyOffs = def.weeklyOffs;
  const hoursPerDay = Number(input?.hoursPerDay || def.hoursPerDay);
  const hp =
    Number.isFinite(hoursPerDay) && hoursPerDay > 0 && hoursPerDay <= 24
      ? hoursPerDay
      : def.hoursPerDay;
  return { payableDaysMode: mode, weeklyOffs, hoursPerDay: hp };
}

function computePayableDays(settings, year, month /* 1-12 */) {
  const s = coerceSalarySettings(settings);
  const dim = new Date(year, month, 0).getDate();
  switch (s.payableDaysMode) {
    case "every_30":
      return 30;
    case "every_28":
      return 28;
    case "every_26":
      return 26;
    case "exclude_weekly_offs": {
      let count = 0;
      for (let d = 1; d <= dim; d += 1) {
        const wd = new Date(year, month - 1, d).getDay(); // 0-6
        if (!s.weeklyOffs.includes(wd)) count += 1;
      }
      return count;
    }
    case "calendar_month":
    default:
      return dim;
  }
}

async function getSettingsPayableDays(orgAccount, monthKey) {
  if (!monthKey) return 30;
  const [yy, mm] = monthKey.split('-').map(Number);
  const dim = new Date(yy, mm, 0).getDate();
  const orgAccountId = orgAccount?.id || orgAccount; // Can be orgAccount object or raw orgAccountId
  if (!orgAccountId) return dim;
  try {
    const salarySettingsRow = await AppSetting.findOne({
      where: { key: 'salary_settings', orgAccountId }
    });
    if (!salarySettingsRow?.value) return dim;
    const salarySettings = JSON.parse(salarySettingsRow.value);
    return computePayableDays(salarySettings, yy, mm);
  } catch (e) {
    return dim;
  }
}

module.exports = {
  coerceSalarySettings,
  computePayableDays,
  getSettingsPayableDays
};
