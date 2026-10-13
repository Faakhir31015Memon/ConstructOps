/**
 * cascadeDelete.service.js
 *
 * Deletes all data associated with a company:
 *   Projects → Workers, Expenses, Materials, MaterialLogs, Alerts,
 *               DailyReports, Contracts, Payments, ProjectAssignments, Attendance
 *   Then: Company record, all Users of company, SubscriptionPayments
 *
 * Usage:
 *   deleteCompanyData(companyId)                          → delete everything
 *   deleteCompanyData(companyId, { deleteUsers: false })  → keep users
 *   deleteCompanyData(companyId, { deleteCompany: false, deleteUsers: false }) → data only
 */

import Project           from '../models/project.model.js';
import User              from '../models/user.model.js';
import Company           from '../models/company.model.js';
import Alert             from '../models/alert.model.js';
import Worker            from '../models/worker.model.js';
import Expense           from '../models/expense.model.js';
import Material          from '../models/material.model.js';
import MaterialLog       from '../models/materialLog.model.js';
import DailyReport       from '../models/dailyReport.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import SubscriptionPayment from '../models/subscriptionPayment.model.js';
import Contract          from '../models/contract.model.js';
import Payment           from '../models/payment.model.js';
import Attendance        from '../models/attendance.model.js';

/**
 * Delete every record that belongs to a company.
 * @param {string|ObjectId} companyId
 * @param {{ deleteCompany?: boolean, deleteUsers?: boolean }} options
 */
export const deleteCompanyData = async (
  companyId,
  { deleteCompany = true, deleteUsers = true } = {}
) => {
  if (!companyId) return;

  // 1. Gather all project IDs for this company
  const projects = await Project.find({ companyId }, '_id');
  const projectIds = projects.map((p) => p._id);

  // 2. Delete everything linked to those projects and company (in parallel)
  await Promise.allSettled([
    Worker.deleteMany({ projectId: { $in: projectIds } }),
    Expense.deleteMany({
      $or: [
        { projectId: { $in: projectIds } },
        { companyId: companyId },
      ],
    }),
    Material.deleteMany({ projectId: { $in: projectIds } }),
    MaterialLog.deleteMany({ projectId: { $in: projectIds } }),
    Alert.deleteMany({ projectId: { $in: projectIds } }),
    DailyReport.deleteMany({ projectId: { $in: projectIds } }),
    ProjectAssignment.deleteMany({ projectId: { $in: projectIds } }),
    Contract.deleteMany({ projectId: { $in: projectIds } }),
    Payment.deleteMany({ projectId: { $in: projectIds } }),
    Attendance.deleteMany({ projectId: { $in: projectIds } }),
    SubscriptionPayment.deleteMany({ companyId }),
  ]);

  // 3. Delete the projects themselves
  await Project.deleteMany({ companyId });

  // 4. Optionally delete all users of this company
  if (deleteUsers) {
    await User.deleteMany({ companyId });
  }

  // 5. Optionally delete the company record itself
  if (deleteCompany) {
    await Company.findByIdAndDelete(companyId);
  }
};
