router.get('/reports/org-tickets', async (req, res) => {
  try {
    const orgId = requireOrg(req, res); if (!orgId) return;
    const { month, year, format, employeeIds } = req.query;
    const { Ticket, User, StaffProfile, TicketHistory } = require('../models');

    const startDate = month && year ? new Date(year, month - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    let staffWhereClause = { orgAccountId: orgId, role: 'staff' };
    if (employeeIds) {
      const empIds = employeeIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (empIds.length > 0) staffWhereClause.id = { [Op.in]: empIds };
    }

    const staffData = await User.findAll({
      where: staffWhereClause,
      attributes: ['id', 'phone'],
      include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'department'] }]
    });

    const tickets = await Ticket.findAll({
      where: {
        orgAccountId: orgId,
        allocatedTo: staffData.map(s => s.id),
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'phone'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'department'] }]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'phone'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
        },
        {
          model: User,
          as: 'closedBy',
          attributes: ['id', 'phone'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
        },
        {
          model: TicketHistory,
          as: 'history',
          include: [{
            model: User,
            as: 'updater',
            attributes: ['id', 'phone'],
            include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (format === 'excel') {
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Tickets Report');

      worksheet.columns = [
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Allocated To', key: 'allocatedTo', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Ticket Title', key: 'title', width: 30 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Allocated By', key: 'allocatedBy', width: 25 },
        { header: 'Closed By', key: 'closedBy', width: 25 },
        { header: 'Ticket History', key: 'history', width: 60 }
      ];

      tickets.forEach(t => {
        const historyText = t.history?.map(h => 
          `[${dayjs(h.createdAt).format('DD/MM HH:mm')}] ${h.updater?.profile?.name || h.updater?.phone || 'System'}: ${h.newStatus}${h.remarks ? ` (${h.remarks})` : ''}`
        ).join('\n') || '-';

        worksheet.addRow({
          createdAt: dayjs(t.createdAt).format('DD MMM YYYY HH:mm'),
          allocatedTo: t.assignee?.profile?.name || t.assignee?.phone || 'N/A',
          department: t.assignee?.profile?.department || 'N/A',
          title: t.title,
          priority: t.priority,
          status: t.status,
          allocatedBy: t.creator?.profile?.name || t.creator?.phone || 'N/A',
          closedBy: t.closedBy?.profile?.name || t.closedBy?.phone || '-',
          history: historyText
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F7FF' } };
      worksheet.getColumn('history').alignment = { wrapText: true, vertical: 'top' };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=org-tickets-report-${month}-${year}.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Org tickets report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate tickets report' });
  }
});
