import Project from '../models/project.model.js';
import Worker from '../models/worker.model.js';
import DailyReport from '../models/dailyReport.model.js';
import Expense from '../models/expense.model.js';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import SubscriptionPayment from '../models/subscriptionPayment.model.js';
import { getCompanySubscriptionDetails, getPlanLimits } from '../utils/subscription.util.js';
import serverError from '../utils/serverError.js';

const STEPS = [
  { key: 'account', label: 'Account created' },
  { key: 'site', label: 'First site added' },
  { key: 'labour', label: 'First worker added' },
  { key: 'report', label: 'First daily report' },
  { key: 'costs', label: 'First expense logged' },
];

/**
 * Per-company activation: which onboarding steps are done and what is next.
 * Drives the in-app checklist; the same shape is used by the admin funnel.
 */
export const getCompanyActivation = async (req, res) => {
  try {
    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'This account has no company attached' });
    }

    const company = await Company.findById(companyId).select('name subscriptionPlan subscriptionStatus subscriptionEndDate isTrial createdAt');
    const [projectCount, workerCount, reportCount, expenseCount, userCount] = await Promise.all([
      Project.countDocuments({ companyId }),
      (async () => {
        const ids = (await Project.find({ companyId }).select('_id').lean()).map((p) => p._id);
        return Worker.countDocuments({ projectId: { $in: ids } });
      })(),
      (async () => {
        const ids = (await Project.find({ companyId }).select('_id').lean()).map((p) => p._id);
        return DailyReport.countDocuments({ projectId: { $in: ids } });
      })(),
      Expense.countDocuments({ companyId }),
      User.countDocuments({ companyId }),
    ]);

    const done = {
      account: true,
      site: projectCount > 0,
      labour: workerCount > 0,
      report: reportCount > 0,
      costs: expenseCount > 0,
    };
    const nextStep = STEPS.find((step) => !done[step.key]) || null;
    const completed = STEPS.filter((step) => done[step.key]).length;
    const limits = getPlanLimits(company?.subscriptionPlan || 'trial');

    res.json({
      success: true,
      activation: {
        steps: STEPS.map((step) => ({ ...step, done: done[step.key] })),
        completedSteps: completed,
        totalSteps: STEPS.length,
        percent: Math.round((completed / STEPS.length) * 100),
        nextStep: nextStep?.key || null,
        nextStepLabel: nextStep?.label || null,
        counts: { projects: projectCount, workers: workerCount, reports: reportCount, expenses: expenseCount, users: userCount },
        limits,
        subscription: company ? getCompanySubscriptionDetails(company) : null,
      },
    });
  } catch (error) {
    serverError(res, error, req);
  }
};

/**
 * Cross-tenant funnel for the system admin — the numbers an investor asks for:
 * signups, activation, and how many of those became paying.
 */
export const getAdminActivation = async (req, res) => {
  try {
    const days = Math.min(365, Math.max(7, Number(req.query.days || 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalCompanies, companies, paidCompanyIds, recentCompanies] = await Promise.all([
      Company.countDocuments({}),
      Company.find({}).select('name subscriptionPlan subscriptionStatus createdAt').lean(),
      SubscriptionPayment.distinct('companyId', { status: 'approved' }),
      Company.find({ createdAt: { $gte: since } })
        .select('name createdAt subscriptionPlan subscriptionStatus')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    ]);

    const projects = await Project.find({}).select('_id companyId createdAt').lean();
    const projectIdsByCompany = new Map();
    projects.forEach((project) => {
      const key = String(project.companyId);
      if (!projectIdsByCompany.has(key)) projectIdsByCompany.set(key, []);
      projectIdsByCompany.get(key).push(project._id);
    });

    const [workerProjectIds, reportProjectIds, paidCompanySet] = await Promise.all([
      Worker.distinct('projectId'),
      DailyReport.distinct('projectId'),
      new Set(paidCompanyIds.map(String)),
    ]);

    const projectToCompany = new Map(projects.map((p) => [String(p._id), String(p.companyId)]));
    const companiesWithWorkers = new Set(workerProjectIds.map((id) => projectToCompany.get(String(id))).filter(Boolean));
    const companiesWithReports = new Set(reportProjectIds.map((id) => projectToCompany.get(String(id))).filter(Boolean));

    const funnel = {
      signups: totalCompanies,
      withSite: projectIdsByCompany.size,
      withWorkers: companiesWithWorkers.size,
      withDailyReport: companiesWithReports.size,
      paying: paidCompanySet.size,
    };

    const activationRate = funnel.signups ? Math.round((funnel.withDailyReport / funnel.signups) * 100) : 0;
    const paidConversion = funnel.signups ? Number(((funnel.paying / funnel.signups) * 100).toFixed(1)) : 0;

    const planCounts = companies.reduce((acc, company) => {
      acc[company.subscriptionPlan || 'trial'] = (acc[company.subscriptionPlan || 'trial'] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      windowDays: days,
      funnel,
      activationRate,
      paidConversion,
      planCounts,
      recentCompanies: recentCompanies.map((company) => ({
        _id: company._id,
        name: company.name,
        createdAt: company.createdAt,
        plan: company.subscriptionPlan,
        status: company.subscriptionStatus,
        hasSite: projectIdsByCompany.has(String(company._id)),
        hasWorkers: companiesWithWorkers.has(String(company._id)),
        hasReports: companiesWithReports.has(String(company._id)),
        paying: paidCompanySet.has(String(company._id)),
      })),
    });
  } catch (error) {
    serverError(res, error, req);
  }
};
