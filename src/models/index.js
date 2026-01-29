const { sequelize } = require('../sequelize');

const defineUser = require('./User');
const defineStaffProfile = require('./StaffProfile');
const defineAttendance = require('./Attendance');
const defineLeaveRequest = require('./LeaveRequest');
const defineLeaveTemplate = require('./LeaveTemplate');
const defineLeaveTemplateCategory = require('./LeaveTemplateCategory');
const defineStaffLeaveAssignment = require('./StaffLeaveAssignment');
const defineLeaveBalance = require('./LeaveBalance');
const defineAppSetting = require('./AppSetting');
const defineDocumentType = require('./DocumentType');
const defineStaffDocument = require('./StaffDocument');
const defineShiftTemplate = require('./ShiftTemplate');
const defineHolidayTemplate = require('./HolidayTemplate');
const defineHolidayDate = require('./HolidayDate');
const defineStaffHolidayAssignment = require('./StaffHolidayAssignment');
const defineShiftBreak = require('./ShiftBreak');
const defineShiftRotationalSlot = require('./ShiftRotationalSlot');
const defineStaffShiftAssignment = require('./StaffShiftAssignment');
const defineSalarySetting = require('./SalarySetting');
const defineSalaryAccess = require('./SalaryAccess');
const defineAttendanceTemplate = require('./AttendanceTemplate');
const defineStaffAttendanceAssignment = require('./StaffAttendanceAssignment');
const defineSalaryTemplate = require('./SalaryTemplate');
const defineStaffSalaryAssignment = require('./StaffSalaryAssignment');
const defineSalesVisit = require('./SalesVisit');
const defineSalesVisitAttachment = require('./SalesVisitAttachment');
const defineClient = require('./Client');
const defineAssignedJob = require('./AssignedJob');
const defineSalesTarget = require('./SalesTarget');
const defineOrder = require('./Order');
const defineOrderItem = require('./OrderItem');
const defineIncentiveTarget = require('./IncentiveTarget');
const defineSite = require('./Site');
const defineWorkUnit = require('./WorkUnit');
const defineRoute = require('./Route');
const defineRouteStop = require('./RouteStop');
const defineStaffRouteAssignment = require('./StaffRouteAssignment');
const defineRouteStopCheckin = require('./RouteStopCheckin');
const defineSiteCheckpoint = require('./SiteCheckpoint');
const definePatrolLog = require('./PatrolLog');
const defineAIAnomaly = require('./AIAnomaly');
const defineReliabilityScore = require('./ReliabilityScore');
const defineSalaryForecast = require('./SalaryForecast');
const defineOtpVerify = require('./OtpVerify');
const defineBusinessFunction = require('./BusinessFunction');
const defineBusinessFunctionValue = require('./BusinessFunctionValue');
const defineWeeklyOffTemplate = require('./WeeklyOffTemplate');
const defineStaffWeeklyOffAssignment = require('./StaffWeeklyOffAssignment');
const defineOrgBrand = require('./OrgBrand');
const defineOrgBankAccount = require('./OrgBankAccount');
const defineOrgKyb = require('./OrgKyb');
const defineOrgBusinessInfo = require('./OrgBusinessInfo');
const defineGeofenceTemplate = require('./GeofenceTemplate');
const defineGeofenceSite = require('./GeofenceSite');
const defineStaffGeofenceAssignment = require('./StaffGeofenceAssignment');
const defineLocationPing = require('./LocationPing');
const definePayrollCycle = require('./PayrollCycle');
const definePayrollLine = require('./PayrollLine');

const User = defineUser(sequelize);
const StaffProfile = defineStaffProfile(sequelize);
const Attendance = defineAttendance(sequelize);
const LeaveRequest = defineLeaveRequest(sequelize);
const LeaveTemplate = defineLeaveTemplate(sequelize);
const LeaveTemplateCategory = defineLeaveTemplateCategory(sequelize);
const StaffLeaveAssignment = defineStaffLeaveAssignment(sequelize);
const LeaveBalance = defineLeaveBalance(sequelize);
const AppSetting = defineAppSetting(sequelize);
const DocumentType = defineDocumentType(sequelize);
const StaffDocument = defineStaffDocument(sequelize);
const ShiftTemplate = defineShiftTemplate(sequelize);
const HolidayTemplate = defineHolidayTemplate(sequelize);
const HolidayDate = defineHolidayDate(sequelize);
const StaffHolidayAssignment = defineStaffHolidayAssignment(sequelize);
const ShiftBreak = defineShiftBreak(sequelize);
const ShiftRotationalSlot = defineShiftRotationalSlot(sequelize);
const StaffShiftAssignment = defineStaffShiftAssignment(sequelize);
const SalarySetting = defineSalarySetting(sequelize);
const SalaryAccess = defineSalaryAccess(sequelize);
const AttendanceTemplate = defineAttendanceTemplate(sequelize);
const StaffAttendanceAssignment = defineStaffAttendanceAssignment(sequelize);
const SalaryTemplate = defineSalaryTemplate(sequelize);
const StaffSalaryAssignment = defineStaffSalaryAssignment(sequelize);
const SalesVisit = defineSalesVisit(sequelize);
const SalesVisitAttachment = defineSalesVisitAttachment(sequelize);
const Client = defineClient(sequelize);
const AssignedJob = defineAssignedJob(sequelize);
const SalesTarget = defineSalesTarget(sequelize);
const Order = defineOrder(sequelize);
const OrderItem = defineOrderItem(sequelize);
const IncentiveTarget = defineIncentiveTarget(sequelize);
const Site = defineSite(sequelize);
const WorkUnit = defineWorkUnit(sequelize);
const Route = defineRoute(sequelize);
const RouteStop = defineRouteStop(sequelize);
const StaffRouteAssignment = defineStaffRouteAssignment(sequelize);
const RouteStopCheckin = defineRouteStopCheckin(sequelize);
const SiteCheckpoint = defineSiteCheckpoint(sequelize);
const PatrolLog = definePatrolLog(sequelize);
const AIAnomaly = defineAIAnomaly(sequelize);
const ReliabilityScore = defineReliabilityScore(sequelize);
const SalaryForecast = defineSalaryForecast(sequelize);
const OtpVerify = defineOtpVerify(sequelize);
const BusinessFunction = defineBusinessFunction(sequelize);
const BusinessFunctionValue = defineBusinessFunctionValue(sequelize);
const WeeklyOffTemplate = defineWeeklyOffTemplate(sequelize);
const StaffWeeklyOffAssignment = defineStaffWeeklyOffAssignment(sequelize);
const OrgBrand = defineOrgBrand(sequelize);
const OrgBankAccount = defineOrgBankAccount(sequelize);
const OrgKyb = defineOrgKyb(sequelize);
const OrgBusinessInfo = defineOrgBusinessInfo(sequelize);
const GeofenceTemplate = defineGeofenceTemplate(sequelize);
const GeofenceSite = defineGeofenceSite(sequelize);
const StaffGeofenceAssignment = defineStaffGeofenceAssignment(sequelize);
const LocationPing = defineLocationPing(sequelize);
const PayrollCycle = definePayrollCycle(sequelize);
const PayrollLine = definePayrollLine(sequelize);

// Leave Template associations (after models are defined)
LeaveTemplate.hasMany(LeaveTemplateCategory, { foreignKey: 'leaveTemplateId', as: 'categories' });
LeaveTemplateCategory.belongsTo(LeaveTemplate, { foreignKey: 'leaveTemplateId', as: 'template' });
User.hasMany(StaffLeaveAssignment, { foreignKey: 'userId', as: 'leaveAssignments' });
StaffLeaveAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
LeaveTemplate.hasMany(StaffLeaveAssignment, { foreignKey: 'leaveTemplateId', as: 'assignments' });
StaffLeaveAssignment.belongsTo(LeaveTemplate, { foreignKey: 'leaveTemplateId', as: 'template' });
User.hasMany(LeaveBalance, { foreignKey: 'userId', as: 'leaveBalances' });
LeaveBalance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(StaffProfile, { foreignKey: 'userId', as: 'profile' });
StaffProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendance' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(LeaveRequest, { foreignKey: 'userId', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(LeaveRequest, { foreignKey: 'reviewedBy', as: 'reviewedLeaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

DocumentType.hasMany(StaffDocument, { foreignKey: 'documentTypeId', as: 'staffDocuments' });
StaffDocument.belongsTo(DocumentType, { foreignKey: 'documentTypeId', as: 'type' });

User.hasMany(StaffDocument, { foreignKey: 'userId', as: 'documents' });
StaffDocument.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(StaffShiftAssignment, { foreignKey: 'userId', as: 'shiftAssignments' });
StaffShiftAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

ShiftTemplate.hasMany(StaffShiftAssignment, { foreignKey: 'shiftTemplateId', as: 'assignments' });
StaffShiftAssignment.belongsTo(ShiftTemplate, { foreignKey: 'shiftTemplateId', as: 'template' });

// Shift breaks associations
ShiftTemplate.hasMany(ShiftBreak, { foreignKey: 'shiftTemplateId', as: 'breaks' });
ShiftBreak.belongsTo(ShiftTemplate, { foreignKey: 'shiftTemplateId', as: 'template' });

// Rotational shift slots associations
ShiftTemplate.hasMany(ShiftRotationalSlot, { foreignKey: 'shiftTemplateId', as: 'slots' });
ShiftRotationalSlot.belongsTo(ShiftTemplate, { foreignKey: 'shiftTemplateId', as: 'template' });

// Holiday templates associations
HolidayTemplate.hasMany(HolidayDate, { foreignKey: 'holidayTemplateId', as: 'holidays' });
HolidayDate.belongsTo(HolidayTemplate, { foreignKey: 'holidayTemplateId', as: 'template' });
User.hasMany(StaffHolidayAssignment, { foreignKey: 'userId', as: 'holidayAssignments' });
StaffHolidayAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
HolidayTemplate.hasMany(StaffHolidayAssignment, { foreignKey: 'holidayTemplateId', as: 'assignments' });
StaffHolidayAssignment.belongsTo(HolidayTemplate, { foreignKey: 'holidayTemplateId', as: 'template' });

// Business Functions associations
BusinessFunction.hasMany(BusinessFunctionValue, { foreignKey: 'businessFunctionId', as: 'values' });
BusinessFunctionValue.belongsTo(BusinessFunction, { foreignKey: 'businessFunctionId', as: 'function' });

// Weekly Off associations
WeeklyOffTemplate.hasMany(StaffWeeklyOffAssignment, { foreignKey: 'weeklyOffTemplateId', as: 'assignments' });
StaffWeeklyOffAssignment.belongsTo(WeeklyOffTemplate, { foreignKey: 'weeklyOffTemplateId', as: 'template' });
User.hasMany(StaffWeeklyOffAssignment, { foreignKey: 'userId', as: 'weeklyOffAssignments' });
StaffWeeklyOffAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Geofence associations
GeofenceTemplate.hasMany(GeofenceSite, { foreignKey: 'geofenceTemplateId', as: 'sites' });
GeofenceSite.belongsTo(GeofenceTemplate, { foreignKey: 'geofenceTemplateId', as: 'template' });
User.hasMany(StaffGeofenceAssignment, { foreignKey: 'userId', as: 'geofenceAssignments' });
StaffGeofenceAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
GeofenceTemplate.hasMany(StaffGeofenceAssignment, { foreignKey: 'geofenceTemplateId', as: 'assignments' });
StaffGeofenceAssignment.belongsTo(GeofenceTemplate, { foreignKey: 'geofenceTemplateId', as: 'template' });
User.hasMany(LocationPing, { foreignKey: 'userId', as: 'locationPings' });
LocationPing.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(SalaryAccess, { foreignKey: 'userId', as: 'salaryAccess' });
SalaryAccess.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Attendance Template associations
User.hasMany(StaffAttendanceAssignment, { foreignKey: 'userId', as: 'attendanceAssignments' });
StaffAttendanceAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
AttendanceTemplate.hasMany(StaffAttendanceAssignment, { foreignKey: 'attendanceTemplateId', as: 'assignments' });
StaffAttendanceAssignment.belongsTo(AttendanceTemplate, { foreignKey: 'attendanceTemplateId', as: 'template' });

// Salary Template associations
User.hasMany(StaffSalaryAssignment, { foreignKey: 'userId', as: 'salaryAssignments' });
StaffSalaryAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SalaryTemplate.hasMany(StaffSalaryAssignment, { foreignKey: 'salaryTemplateId', as: 'assignments' });
StaffSalaryAssignment.belongsTo(SalaryTemplate, { foreignKey: 'salaryTemplateId', as: 'template' });

// User Salary Template association
User.belongsTo(SalaryTemplate, { foreignKey: 'salaryTemplateId', as: 'salaryTemplate' });
SalaryTemplate.hasMany(User, { foreignKey: 'salaryTemplateId', as: 'staff' });

// Sales models associations
User.hasMany(SalesVisit, { foreignKey: 'userId', as: 'salesVisits' });
SalesVisit.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SalesVisit.hasMany(SalesVisitAttachment, { foreignKey: 'visitId', as: 'attachments' });
SalesVisitAttachment.belongsTo(SalesVisit, { foreignKey: 'visitId', as: 'visit' });

// Client/AssignedJob associations
Client.hasMany(AssignedJob, { foreignKey: 'clientId', as: 'assignments' });
AssignedJob.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
User.hasMany(AssignedJob, { foreignKey: 'staffUserId', as: 'assignedJobs' });
AssignedJob.belongsTo(User, { foreignKey: 'staffUserId', as: 'staff' });

// SalesTarget associations
User.hasMany(SalesTarget, { foreignKey: 'staffUserId', as: 'salesTargets' });
SalesTarget.belongsTo(User, { foreignKey: 'staffUserId', as: 'staff' });

// IncentiveTarget associations
User.hasMany(IncentiveTarget, { foreignKey: 'staffUserId', as: 'incentiveTargets' });
IncentiveTarget.belongsTo(User, { foreignKey: 'staffUserId', as: 'staff' });

// Orders associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Client.hasMany(Order, { foreignKey: 'clientId', as: 'orders' });
Order.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
AssignedJob.hasMany(Order, { foreignKey: 'assignedJobId', as: 'orders' });
Order.belongsTo(AssignedJob, { foreignKey: 'assignedJobId', as: 'assignedJob' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Construction models associations
Site.hasMany(WorkUnit, { foreignKey: 'siteId', as: 'workUnits' });
WorkUnit.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
User.hasMany(WorkUnit, { foreignKey: 'userId', as: 'workUnits' });
WorkUnit.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Logistics models associations
Route.hasMany(RouteStop, { foreignKey: 'routeId', as: 'stops' });
RouteStop.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
User.hasMany(StaffRouteAssignment, { foreignKey: 'userId', as: 'routeAssignments' });
StaffRouteAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Route.hasMany(StaffRouteAssignment, { foreignKey: 'routeId', as: 'assignments' });
StaffRouteAssignment.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
User.hasMany(RouteStopCheckin, { foreignKey: 'userId', as: 'routeCheckins' });
RouteStopCheckin.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Route.hasMany(RouteStopCheckin, { foreignKey: 'routeId', as: 'checkins' });
RouteStopCheckin.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
RouteStop.hasMany(RouteStopCheckin, { foreignKey: 'routeStopId', as: 'checkins' });
RouteStopCheckin.belongsTo(RouteStop, { foreignKey: 'routeStopId', as: 'stop' });

// Security models associations
Site.hasMany(SiteCheckpoint, { foreignKey: 'siteId', as: 'checkpoints' });
SiteCheckpoint.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
User.hasMany(PatrolLog, { foreignKey: 'userId', as: 'patrolLogs' });
PatrolLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Site.hasMany(PatrolLog, { foreignKey: 'siteId', as: 'patrolLogs' });
PatrolLog.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
SiteCheckpoint.hasMany(PatrolLog, { foreignKey: 'checkpointId', as: 'patrolLogs' });
PatrolLog.belongsTo(SiteCheckpoint, { foreignKey: 'checkpointId', as: 'checkpoint' });

// AI models associations
User.hasMany(AIAnomaly, { foreignKey: 'userId', as: 'aiAnomalies' });
AIAnomaly.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ReliabilityScore, { foreignKey: 'userId', as: 'reliabilityScores' });
ReliabilityScore.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(SalaryForecast, { foreignKey: 'userId', as: 'salaryForecasts' });
SalaryForecast.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  StaffProfile,
  Attendance,
  LeaveRequest,
  LeaveTemplate,
  LeaveTemplateCategory,
  StaffLeaveAssignment,
  LeaveBalance,
  AppSetting,
  DocumentType,
  StaffDocument,
  ShiftTemplate,
  ShiftBreak,
  ShiftRotationalSlot,
  StaffShiftAssignment,
  HolidayTemplate,
  HolidayDate,
  StaffHolidayAssignment,
  SalarySetting,
  SalaryAccess,
  AttendanceTemplate,
  StaffAttendanceAssignment,
  SalaryTemplate,
  StaffSalaryAssignment,
  SalesVisit,
  SalesVisitAttachment,
  Client,
  AssignedJob,
  SalesTarget,
  Order,
  OrderItem,
  IncentiveTarget,
  Site,
  WorkUnit,
  Route,
  RouteStop,
  StaffRouteAssignment,
  RouteStopCheckin,
  SiteCheckpoint,
  PatrolLog,
  AIAnomaly,
  ReliabilityScore,
  SalaryForecast,
  OtpVerify,
  BusinessFunction,
  BusinessFunctionValue,
  WeeklyOffTemplate,
  StaffWeeklyOffAssignment,
  OrgBrand,
  OrgBankAccount,
  OrgKyb,
  OrgBusinessInfo,
  GeofenceTemplate,
  GeofenceSite,
  StaffGeofenceAssignment,
  LocationPing,
  PayrollCycle,
  PayrollLine,
};
