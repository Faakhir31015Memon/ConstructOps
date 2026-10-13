/**
 * cascadeDelete.service.js
 *
 * Deletes all data associated with a company:
 *   Projects → Workers, Expenses, Materials, MaterialLogs, Alerts,
 *               DailyReports, Contracts, Payments, ProjectAssignments,
 *               Attendance
 *   Then: the Company record, all its Users, SubscriptionPayments
 *
 * Call deleteCompanyData(companyId) from any route that hard-deletes a company
 * or when admin explicitly clears/deactivates a company's account.
 */

import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import Alert from '../models/alert.model.js';
import Worker from '../models/worker.model.js';
import Expense from '../models/expense.model.js';
import Material from '../models/material.model.js';
import MaterialLog from '../models/materialLog.model.js';
import DailyReport from '../models/dailyReport.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import SubscriptionPayment from '../models/subscriptionPayment.model.js';

// Optional models — import only if they exist
let Contract, Payment, Attendance;
try { ({ default: Contract } = await import('../models/contract.model.js')); } catch (_) {}
try { ({ default: Payment } = await import('../models/payment.model.js')); } catch (_) {}
try { ({ default: Attendance } = await import('../models/attendance.model.js')); } catch (_) {}

/**
 * Delete every record that belongs to a company.
 * @param {string|ObjectId} companyId
 * @param {object} options
 * @param {boolean} options.deleteCompany - also remove the Company document (default: true)
 * @param {boolean} options.deleteUsers   - also remove all Users of the company (default: true)
 */
export const deleteCompanyData = async (companyId, { deleteCompany = true, deleteUsers = true } = {}) => {
  // 1. Gather all project IDs for this company
  const projects = await Project.find({ companyId }, '_id');
  const projectIds = projects.map((p) => p._id);

  if (projectIds.length > 0) {
    // 2. Delete all project-level records in parallel
    await Promise.all([
      Worker.deleteMany({ projectId: { $in: projectIds } }),
      Expense.deleteMany({ projectId: { $in: projectIds } }),
      Material.deleteMany({ projectId: { $in: projectIds } }),
      MaterialLog.deleteMany({ projectId: { $in: projectIds } }),
      Alert.deleteMany({ projectId: { $in: projectIds } }),
      DailyReport.deleteMany({ projectId: { $in: projectIds } }),
      ProjectAssignment.deleteMany({ projectId: { $in: projectIds } }),
      Contract ? Contract.deleteMany({ projectId: { $in: projectIds } }) : Promise.resolve(),
      Payment ? Payment.deleteMany({ projectId: { $in: projectIds } }) : Promise.resolve(),
      Attendance ? Attendance.deleteMany({ projectId: { $in: projectIds } }) : Promise.resolve(),
    ]);

    // 3. Delete the projects themselves
    await Project.deleteMany({ companyId });
  }

  // 4. Delete subscription payments
  await SubscriptionPayment.deleteMany({ companyId });

  // 5. Delete all users of this company
  if (deleteUsers) {
    await User.deleteMany({ companyId });
  }

  // 6. Delete the company itself
  if (deleteCompany) {
    await Company.findByIdAndDelete(companyId);
  }
};
