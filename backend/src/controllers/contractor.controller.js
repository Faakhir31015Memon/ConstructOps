import { sameId } from '../utils/ids.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import Contract from '../models/contract.model.js';
import Payment from '../models/payment.model.js';
import Expense from '../models/expense.model.js';

// @desc    Add / Register a Contractor account for the company
// @route   POST /api/v1/contractors
// @access  Private (Owner, Manager only)
export const createContractor = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const contractor = await User.create({
      name,
      email,
      password,
      role: 'contractor',
      companyId: req.user.companyId,
    });

    res.status(201).json({
      success: true,
      message: 'Contractor account created successfully',
      contractor: {
        id: contractor._id,
        name: contractor.name,
        email: contractor.email,
        role: contractor.role,
        companyId: contractor.companyId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get all contractors belonging to company
// @route   GET /api/v1/contractors
// @access  Private (Owner, Manager)
export const getCompanyContractors = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { role: 'contractor' }
      : { role: 'contractor', companyId: req.user.companyId };

    const contractors = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Populate active project assignments count for each contractor
    const contractorIds = contractors.map(c => c._id);
    const assignments = await ProjectAssignment.find({
      contractorId: { $in: contractorIds },
      status: 'active',
    }).populate('projectId', 'name location status');

    const result = contractors.map(c => {
      const myAssignments = assignments.filter(a => a.contractorId.toString() === c._id.toString());
      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        status: c.status,
        createdAt: c.createdAt,
        assignedProjects: myAssignments.map(a => a.projectId),
      };
    });

    res.json({ success: true, contractors: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Assign contractor to project
// @route   POST /api/v1/contractors/assign
// @access  Private (Owner, Manager)
export const assignContractorToProject = async (req, res) => {
  const { projectId, contractorId } = req.body;

  try {
    if (!projectId || !contractorId) {
      return res.status(400).json({ success: false, message: 'Please provide projectId and contractorId' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Project belongs to another company' });
    }

    const contractor = await User.findOne({
      _id: contractorId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!contractor) {
      return res.status(404).json({ success: false, message: 'Contractor not found in your company' });
    }

    // Upsert or update status to active
    let assignment = await ProjectAssignment.findOne({ projectId, contractorId });

    if (assignment) {
      assignment.status = 'active';
      assignment.assignedBy = req.user._id;
      await assignment.save();
    } else {
      assignment = await ProjectAssignment.create({
        companyId: project.companyId,
        projectId,
        contractorId,
        status: 'active',
        assignedBy: req.user._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `${contractor.name} assigned to project ${project.name}`,
      assignment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Revoke contractor access from project
// @route   POST /api/v1/contractors/revoke
// @access  Private (Owner, Manager)
export const revokeContractorAssignment = async (req, res) => {
  const { projectId, contractorId } = req.body;

  try {
    if (!projectId || !contractorId) {
      return res.status(400).json({ success: false, message: 'Please provide projectId and contractorId' });
    }

    const assignment = await ProjectAssignment.findOne({ projectId, contractorId });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment record not found' });
    }

    if (req.user.role !== 'admin' && !sameId(assignment.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Assignment belongs to another company' });
    }

    assignment.status = 'revoked';
    await assignment.save();

    res.json({
      success: true,
      message: 'Contractor access revoked from project',
      assignment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Create or update contract terms & milestones
// @route   POST /api/v1/contractors/contracts
// @access  Private (Owner, Manager)
export const saveContract = async (req, res) => {
  const { projectId, contractorId, contractAmount, terms, milestones } = req.body;

  try {
    if (!projectId || !contractorId || !contractAmount) {
      return res.status(400).json({ success: false, message: 'Please provide projectId, contractorId, and contractAmount' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Project belongs to another company' });
    }

    let contract = await Contract.findOne({ projectId, contractorId });

    if (contract) {
      contract.contractAmount = Number(contractAmount);
      if (terms !== undefined) contract.terms = terms;
      if (milestones !== undefined) contract.milestones = milestones;
      await contract.save();
    } else {
      contract = await Contract.create({
        companyId: project.companyId,
        projectId,
        contractorId,
        contractAmount: Number(contractAmount),
        terms: terms || '',
        milestones: milestones || [],
      });
    }

    res.json({ success: true, message: 'Contract saved successfully', contract });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get contract details for project
// @route   GET /api/v1/contractors/contracts/:projectId
// @access  Private (Owner, or Assigned Contractor)
export const getContractByProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Project belongs to another company' });
    }

    const query = { projectId };
    if (req.user.role === 'contractor') {
      query.contractorId = req.user._id;
    }

    const contract = await Contract.findOne(query)
      .populate('contractorId', 'name email');

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Record contractor payment
// @route   POST /api/v1/contractors/payments
// @access  Private (Owner, Accountant)
export const recordPayment = async (req, res) => {
  const { projectId, contractorId, contractId, amount, paymentMethod, referenceNumber, notes, paymentDate } = req.body;

  try {
    if (!projectId || !contractorId || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide projectId, contractorId, and amount' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Project belongs to another company' });
    }

    const payment = await Payment.create({
      companyId: project.companyId,
      projectId,
      contractorId,
      contractId: contractId || null,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'bank_transfer',
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      paymentDate: paymentDate || new Date(),
      status: 'paid',
      recordedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Payment recorded successfully', payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get payments for project
// @route   GET /api/v1/contractors/payments/:projectId
// @access  Private (Owner, Accountant, or Assigned Contractor)
export const getPaymentsByProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && !sameId(project.companyId, req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Project belongs to another company' });
    }

    const query = { projectId };
    if (req.user.role === 'contractor') {
      query.contractorId = req.user._id;
    }

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .populate('contractorId', 'name email')
      .populate('recordedBy', 'name');

    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
