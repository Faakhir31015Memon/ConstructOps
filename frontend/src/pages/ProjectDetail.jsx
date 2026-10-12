import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getProjectDashboard, 
  getWorkers, 
  addWorker, 
  checkInAttendance, 
  getAttendance, 
  getMaterials, 
  addMaterial, 
  logMaterialTransaction, 
  getMaterialLogs, 
  getExpenses, 
  addExpense, 
  getReports, 
  createReport, 
  getAlerts, 
  markAlertRead,
  updateProject,
  reviewExpense,
  getContractors,
  assignContractor,
  revokeContractor,
  getProjectContract,
  saveProjectContract,
  getProjectPayments,
  recordProjectPayment
} from '../services/api';
import { 
  Briefcase, 
  DollarSign, 
  Users, 
  Layers, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  Plus, 
  Calendar, 
  Check, 
  Camera, 
  Mic, 
  MicOff, 
  CheckCircle, 
  UserPlus, 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Dashboard & Project State
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tabError, setTabError] = useState('');

  // Modals Toggles
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showMaterialLogModal, setShowMaterialLogModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Tab Details States
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [materials, setMaterials] = useState([]);
  const [materialLogs, setMaterialLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reports, setReports] = useState([]);
  
  // Multi-Tenant Contractor, Contract & Payment States
  const [projectContract, setProjectContract] = useState(null);
  const [projectPayments, setProjectPayments] = useState([]);
  const [companyContractors, setCompanyContractors] = useState([]);
  const [selectedContractorToAssign, setSelectedContractorToAssign] = useState('');
  const [contractAmountInput, setContractAmountInput] = useState('');
  const [contractTermsInput, setContractTermsInput] = useState('');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentContractorInput, setPaymentContractorInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('bank_transfer');
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  
  // Form input States
  // 1. Worker Form
  const [wName, setWName] = useState('');
  const [wRole, setWRole] = useState('');
  const [wWage, setWWage] = useState('');
  const [wPhone, setWPhone] = useState('');
  
  // 2. Material Form
  const [mName, setMName] = useState('');
  const [mUnit, setMUnit] = useState('bags');
  
  // 3. Material Log Form
  const [mlId, setMlId] = useState('');
  const [mlType, setMlType] = useState('IN');
  const [mlQty, setMlQty] = useState('');
  const [mlNote, setMlNote] = useState('');

  // 4. Expense Form
  const [eAmount, setEAmount] = useState('');
  const [eCategory, setECategory] = useState('labor');
  const [eDesc, setEDesc] = useState('');

  // 5. Daily Report Form
  const [rDesc, setRDesc] = useState('');
  const [rWorkType, setRWorkType] = useState('Foundation');
  const [rImages, setRImages] = useState([]);
  
  // Voice Input Simulation
  const [isRecording, setIsRecording] = useState(false);
  const [selectedUrduPhrase, setSelectedUrduPhrase] = useState('');
  const urduPhrases = [
    { urdu: "Aaj slab complete ho gaya hai.", eng: "Slab structure completed successfully today." },
    { urdu: "20 cement ki boriyaan aayi hain.", eng: "20 bags of cement delivered and logged into stock." },
    { urdu: "Kaam slow hai kyun ke barish ho rahi hai.", eng: "Work progress is slow today due to heavy rain interruptions on site." },
    { urdu: "10 mazdoor absent thay aaj.", eng: "10 workers were absent today, affecting overall daily output." },
    { urdu: "Foundation ka khodai ka kaam shuru ho gaya.", eng: "Foundation excavation work has been started today." }
  ];

  const fetchDashboard = async () => {
    try {
      const data = await getProjectDashboard(id);
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (err) {
      console.error(err);
      setTabError('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [id]);

  // Handle Tab changes and lazy loading data
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    setTabError('');
    
    try {
      if (tab === 'workers') {
        const workersRes = await getWorkers(id);
        if (workersRes.success) setWorkers(workersRes.workers);
        fetchAttendanceForDate(selectedDate);
      } else if (tab === 'materials') {
        const matRes = await getMaterials(id);
        const logRes = await getMaterialLogs(id);
        if (matRes.success) setMaterials(matRes.materials);
        if (logRes.success) setMaterialLogs(logRes.logs);
      } else if (tab === 'expenses') {
        const expRes = await getExpenses(id);
        if (expRes.success) setExpenses(expRes.expenses);
      } else if (tab === 'reports') {
        const repRes = await getReports(id);
        if (repRes.success) setReports(repRes.reports);
      } else if (tab === 'contracts') {
        const contractRes = await getProjectContract(id);
        if (contractRes.success) setProjectContract(contractRes.contract);
        const paymentsRes = await getProjectPayments(id);
        if (paymentsRes.success) setProjectPayments(paymentsRes.payments);
      } else if (tab === 'contractors') {
        const contRes = await getContractors();
        if (contRes.success) setCompanyContractors(contRes.contractors);
      }
    } catch (err) {
      console.error('Error fetching tab details:', err);
      setTabError('Failed to fetch module data.');
    }
  };

  const fetchAttendanceForDate = async (date) => {
    try {
      const res = await getAttendance(id, date);
      if (res.success) {
        setAttendance(res.attendance);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const handleAttendanceChange = async (workerId, status) => {
    try {
      const res = await checkInAttendance({
        workerId,
        projectId: id,
        date: selectedDate,
        status
      });
      if (res.success) {
        fetchAttendanceForDate(selectedDate);
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    try {
      const res = await addWorker({
        projectId: id,
        name: wName,
        role: wRole,
        dailyWage: Number(wWage),
        phone: wPhone
      });
      if (res.success) {
        setShowWorkerModal(false);
        setWName(''); setWRole(''); setWWage(''); setWPhone('');
        handleTabChange('workers');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding worker');
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      const res = await addMaterial({
        projectId: id,
        name: mName,
        unit: mUnit
      });
      if (res.success) {
        setShowMaterialModal(false);
        setMName('');
        handleTabChange('materials');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating material');
    }
  };

  const handleLogMaterial = async (e) => {
    e.preventDefault();
    try {
      const res = await logMaterialTransaction({
        projectId: id,
        materialId: mlId,
        type: mlType,
        quantity: Number(mlQty),
        note: mlNote
      });
      if (res.success) {
        setShowMaterialLogModal(false);
        setMlId(''); setMlQty(''); setMlNote('');
        handleTabChange('materials');
        fetchDashboard(); // refresh alerts
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error logging material');
    }
  };

  const handleReviewExpense = async (expenseId, status) => {
    try {
      const res = await reviewExpense(expenseId, status);
      if (res.success) {
        setActionMessage(`Expense ${status} successfully`);
        handleTabChange('expenses');
        fetchDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error reviewing expense');
    }
  };

  const handleAssignContractor = async (e) => {
    e.preventDefault();
    if (!selectedContractorToAssign) return;
    try {
      const res = await assignContractor(id, selectedContractorToAssign);
      if (res.success) {
        setActionMessage('Contractor assigned to project successfully');
        setSelectedContractorToAssign('');
        fetchDashboard();
        handleTabChange('contractors');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error assigning contractor');
    }
  };

  const handleRevokeContractor = async (contractorId) => {
    if (!window.confirm('Are you sure you want to revoke this contractor access from this project?')) return;
    try {
      const res = await revokeContractor(id, contractorId);
      if (res.success) {
        setActionMessage('Contractor access revoked');
        fetchDashboard();
        handleTabChange('contractors');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error revoking contractor');
    }
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    try {
      const contractorIdToBind = dashboardData.assignedContractors?.[0]?._id;
      if (!contractorIdToBind) {
        alert('Please assign a contractor to this project before creating a contract.');
        return;
      }
      const res = await saveProjectContract({
        projectId: id,
        contractorId: contractorIdToBind,
        contractAmount: Number(contractAmountInput),
        terms: contractTermsInput,
      });
      if (res.success) {
        setActionMessage('Contract terms saved successfully');
        handleTabChange('contracts');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving contract');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await recordProjectPayment({
        projectId: id,
        contractorId: paymentContractorInput || dashboardData.assignedContractors?.[0]?._id,
        amount: Number(paymentAmountInput),
        paymentMethod: paymentMethodInput,
        referenceNumber: paymentRefInput,
      });
      if (res.success) {
        setActionMessage('Payment recorded successfully');
        setPaymentAmountInput('');
        setPaymentRefInput('');
        handleTabChange('contracts');
        fetchDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error recording payment');
    }
  };

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await addExpense({
        projectId: id,
        category: eCategory,
        amount: Number(eAmount),
        description: eDesc
      });
      if (res.success) {
        setShowExpenseModal(false);
        setEAmount(''); setEDesc('');
        setActionMessage(res.message || 'Expense submitted');
        handleTabChange('expenses');
        fetchDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding expense');
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (indexToRemove) => {
    setRImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createReport({
        projectId: id,
        description: rDesc,
        workType: rWorkType,
        images: rImages
      });
      if (res.success) {
        setShowReportModal(false);
        setRDesc(''); setRImages([]);
        handleTabChange('reports');
        fetchDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error uploading site report');
    }
  };

  const handleMarkAlert = async (alertId) => {
    try {
      const res = await markAlertRead(alertId);
      if (res.success) {
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteProject = async () => {
    if (window.confirm("Are you sure you want to mark this project as 100% completed?")) {
      try {
        const res = await updateProject(id, { progress: 100, status: 'completed' });
        if (res.success) {
          fetchDashboard();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to update project status');
      }
    }
  };

  const handleVoiceSimulate = (phrase) => {
    setIsRecording(true);
    setSelectedUrduPhrase(phrase.urdu);
    
    // Simulate speech-to-text translation lag
    setTimeout(() => {
      setRDesc(phrase.eng);
      setIsRecording(false);
    }, 1500);
  };

  if (loading) return <div style={styles.loading}>Loading site workspace...</div>;
  if (!dashboardData) return <div style={styles.loading}>{tabError || 'No project loaded'}</div>;

  const isOwner = user?.role === 'owner';
  const isAccountant = user?.role === 'accountant';
  const isManager = user?.role === 'manager';

  return (
    <div style={styles.container}>
      {/* Project Meta Header */}
      <div style={styles.projectHeader}>
        <div>
          <span style={styles.subText}>{dashboardData.location}</span>
          <h1 style={styles.projectTitle}>{dashboardData.projectName}</h1>
        </div>
        <div style={styles.projectHeaderStats}>
          <div style={styles.headerStatBox}>
            <span style={styles.headerStatLabel}>Budget Spent</span>
            <span style={styles.headerStatValue}>
              Rs {dashboardData.spent.toLocaleString()} / <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{dashboardData.budget.toLocaleString()}</span>
            </span>
          </div>
          <div style={styles.headerStatBox}>
            <span style={styles.headerStatLabel}>Remaining Budget</span>
            <span style={{
              ...styles.headerStatValue,
              color: (dashboardData.budget - dashboardData.spent) >= 0 ? 'var(--success-green)' : 'var(--alert-red)'
            }}>
              Rs {(dashboardData.budget - dashboardData.spent).toLocaleString()}
            </span>
          </div>
          <div style={styles.headerStatBox}>
            <span style={styles.headerStatLabel}>Completion %</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {(isOwner || isManager) && dashboardData.progress < 100 && (
                <button 
                  onClick={handleCompleteProject}
                  style={styles.completeBtn}
                  title="Mark project as completed"
                >
                  <CheckCircle size={14} />
                  <span>Complete</span>
                </button>
              )}
              <span style={styles.headerStatValue}>{dashboardData.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => handleTabChange('overview')} 
          style={{...styles.tabButton, ...(activeTab === 'overview' ? styles.activeTabButton : {})}}
        >
          Overview
        </button>
        <button 
          onClick={() => handleTabChange('reports')} 
          style={{...styles.tabButton, ...(activeTab === 'reports' ? styles.activeTabButton : {})}}
        >
          Daily Reports
        </button>
        <button 
          onClick={() => handleTabChange('workers')} 
          style={{...styles.tabButton, ...(activeTab === 'workers' ? styles.activeTabButton : {})}}
        >
          Workers & Attendance
        </button>
        <button 
          onClick={() => handleTabChange('materials')} 
          style={{...styles.tabButton, ...(activeTab === 'materials' ? styles.activeTabButton : {})}}
        >
          Material Stock
        </button>
        <button 
          onClick={() => handleTabChange('expenses')} 
          style={{...styles.tabButton, ...(activeTab === 'expenses' ? styles.activeTabButton : {})}}
        >
          Expenses Ledger {dashboardData?.pendingCount > 0 && `(${dashboardData.pendingCount} pending)`}
        </button>
        <button 
          onClick={() => handleTabChange('contracts')} 
          style={{...styles.tabButton, ...(activeTab === 'contracts' ? styles.activeTabButton : {})}}
        >
          Contracts & Payments
        </button>
        {(isOwner || isManager || user?.role === 'admin') && (
          <button 
            onClick={() => handleTabChange('contractors')} 
            style={{...styles.tabButton, ...(activeTab === 'contractors' ? styles.activeTabButton : {})}}
          >
            Contractor Assignments
          </button>
        )}
      </div>

      {tabError && (
        <div style={styles.tabErrorAlert}>{tabError}</div>
      )}

      {/* TABS VIEWS */}
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={styles.tabContent}>
          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span>Project Budget</span>
                <DollarSign size={20} style={{color: 'var(--steel-blue)'}} />
              </div>
              <h3>Rs {dashboardData.budget.toLocaleString()}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Allocated</span>
            </div>
            
            <div className="card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span>Total Spent</span>
                <DollarSign size={20} style={{color: 'var(--primary-orange)'}} />
              </div>
              <h3>Rs {dashboardData.spent.toLocaleString()}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Outflow</span>
            </div>

            <div className="card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span>Remaining Budget</span>
                <TrendingUp size={20} style={{color: (dashboardData.budget - dashboardData.spent) >= 0 ? 'var(--success-green)' : 'var(--alert-red)'}} />
              </div>
              <h3 style={{color: (dashboardData.budget - dashboardData.spent) >= 0 ? 'var(--success-green)' : 'var(--alert-red)'}}>
                Rs {(dashboardData.budget - dashboardData.spent).toLocaleString()}
              </h3>
              <span style={{ fontSize: '0.75rem', color: (dashboardData.budget - dashboardData.spent) >= 0 ? 'var(--success-green)' : 'var(--alert-red)', fontWeight: '600' }}>
                {(dashboardData.budget - dashboardData.spent) >= 0 ? 'Remaining Budget' : 'Over Budget!'}
              </span>
            </div>

            <div className="card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span>Active Labor</span>
                <Users size={20} style={{color: 'var(--success-green)'}} />
              </div>
              <h3>{dashboardData.activeWorkers} Workers</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checked In Today</span>
            </div>

            <div className="card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span>Unread Alerts</span>
                <AlertTriangle size={20} style={{color: 'var(--alert-red)'}} />
              </div>
              <h3>{dashboardData.alerts.length} Issues</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Required</span>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: '2rem' }}>
            {/* Budget Usage Graphic */}
            <div className="card">
              <h3>Budget Utilization</h3>
              <div style={styles.progressBgSection}>
                <div style={styles.progressLabels}>
                  <span>Total Spent</span>
                  <span>{((dashboardData.spent / dashboardData.budget) * 100).toFixed(1)}% Used</span>
                </div>
                <div style={styles.progressBarBg}>
                  <div style={{ 
                    ...styles.progressBarFill, 
                    width: `${Math.min((dashboardData.spent / dashboardData.budget) * 100, 100)}%`,
                    backgroundColor: dashboardData.spent > dashboardData.budget ? 'var(--alert-red)' : 'var(--primary-orange)'
                  }}></div>
                </div>
              </div>

              {/* Category Breakdown list */}
              <div style={styles.categoryStatsContainer}>
                <h4>Category Breakdown</h4>
                <div style={styles.categoryRow}>
                  <span>Labor Wages</span>
                  <strong>Rs {dashboardData.expensesByCategory.labor.toLocaleString()}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Material Purchases</span>
                  <strong>Rs {dashboardData.expensesByCategory.material.toLocaleString()}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Transport</span>
                  <strong>Rs {dashboardData.expensesByCategory.transport.toLocaleString()}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Miscellaneous</span>
                  <strong>Rs {dashboardData.expensesByCategory.misc.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Smart Alerts Feed */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Active Alerts & Theft Checks</h3>
                <span className="badge badge-danger">Live</span>
              </div>

              {dashboardData.alerts.length === 0 ? (
                <div style={styles.noAlerts}>
                  <CheckCircle size={32} style={{ color: 'var(--success-green)', marginBottom: '0.5rem' }} />
                  <p>All operations normal. No fraud risks or cost breaches detected.</p>
                </div>
              ) : (
                <div style={styles.alertsList}>
                  {dashboardData.alerts.map((al) => (
                    <div key={al._id} style={{
                      ...styles.alertItem,
                      backgroundColor: al.severity === 'high' ? 'var(--alert-red-light)' : 'var(--alert-yellow-light)',
                      borderLeft: `4px solid ${al.severity === 'high' ? 'var(--alert-red)' : 'var(--alert-yellow)'}`
                    }}>
                      <div style={{ flexGrow: 1 }}>
                        <p style={styles.alertMsg}>{al.message}</p>
                        <span style={styles.alertDate}>{new Date(al.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <button onClick={() => handleMarkAlert(al._id)} style={styles.alertReadBtn}>
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. DAILY REPORTS TAB */}
      {activeTab === 'reports' && (
        <div style={styles.tabContent}>
          <div style={styles.tabActions}>
            <h3>Site Activity Logs</h3>
            {user && !isAccountant && (
              <button onClick={() => setShowReportModal(true)} className="btn btn-primary">
                <Camera size={18} />
                <span>Upload Daily Log</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
            {reports.length === 0 ? (
              <div style={styles.noDataBox}>No reports uploaded yet. Site manager must post daily updates.</div>
            ) : (
              reports.map((rep) => (
                <div key={rep._id} className="card" style={styles.reportCard}>
                  <div style={styles.reportHeader}>
                    <div>
                      <span className="badge badge-info">{rep.workType}</span>
                      <span style={styles.reportAuthor}> Posted by {rep.addedBy?.name}</span>
                    </div>
                    <span style={styles.reportDate}>{new Date(rep.date).toLocaleDateString()}</span>
                  </div>

                  <p style={styles.reportDesc}>{rep.description}</p>
                  
                  {/* Photo grids if present */}
                  {rep.images && rep.images.length > 0 && (
                    <div style={styles.imageGrid}>
                      {rep.images.map((img, idx) => (
                        <div key={idx} style={styles.imageBox}>
                          <img src={img} alt="site capture" style={styles.image} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Analysis Widget */}
                  <div style={{
                    ...styles.aiWidget,
                    backgroundColor: rep.aiAnalysis.delayRisk ? 'var(--alert-red-light)' : 'var(--success-green-light)',
                    borderColor: rep.aiAnalysis.delayRisk ? 'var(--alert-red)' : 'var(--success-green)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                      <TrendingUp size={16} style={{ color: rep.aiAnalysis.delayRisk ? 'var(--alert-red)' : 'var(--success-green)' }} />
                      <span>Site Vision AI Analysis Output:</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--dark-graphite-text)' }}>
                      {rep.aiAnalysis.notes}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. WORKERS & ATTENDANCE TAB */}
      {activeTab === 'workers' && (
        <div style={styles.tabContent}>
          <div style={styles.tabActions}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3>Labor Force Registry</h3>
              <input 
                type="date" 
                className="form-control" 
                style={{ width: '180px' }}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  fetchAttendanceForDate(e.target.value);
                }} 
              />
            </div>
            {user && !isAccountant && (
              <button onClick={() => setShowWorkerModal(true)} className="btn btn-primary">
                <UserPlus size={18} />
                <span>Add Worker Profile</span>
              </button>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Worker Name</th>
                    <th>Role</th>
                    <th>Daily Wage (Rs)</th>
                    <th>Phone</th>
                    <th>Attendance State ({selectedDate})</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No labor registered. Add worker profiles first.</td>
                    </tr>
                  ) : (
                    workers.map((work) => {
                      const att = attendance.find(a => a.workerId?._id === work._id);
                      return (
                        <tr key={work._id}>
                          <td><strong>{work.name}</strong></td>
                          <td>{work.role}</td>
                          <td>{work.dailyWage.toLocaleString()}</td>
                          <td>{work.phone}</td>
                          <td>
                            {user && !isAccountant ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => handleAttendanceChange(work._id, 'present')}
                                  style={{
                                    ...styles.attBtn,
                                    backgroundColor: att?.status === 'present' ? 'var(--success-green)' : 'var(--bg-light)',
                                    color: att?.status === 'present' ? '#fff' : '#000',
                                  }}
                                >
                                  Present
                                </button>
                                <button 
                                  onClick={() => handleAttendanceChange(work._id, 'absent')}
                                  style={{
                                    ...styles.attBtn,
                                    backgroundColor: att?.status === 'absent' ? 'var(--alert-red)' : 'var(--bg-light)',
                                    color: att?.status === 'absent' ? '#fff' : '#000',
                                  }}
                                >
                                  Absent
                                </button>
                              </div>
                            ) : (
                              <span className={`badge ${att?.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                                {att ? att.status : 'unmarked'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. MATERIAL STOCK TAB */}
      {activeTab === 'materials' && (
        <div style={styles.tabContent}>
          <div style={styles.tabActions}>
            <h3>Raw Materials Stocks</h3>
            {user && !isAccountant && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowMaterialModal(true)} className="btn btn-outline">
                  <Plus size={18} />
                  <span>Register Material</span>
                </button>
                <button onClick={() => setShowMaterialLogModal(true)} className="btn btn-primary">
                  <Package size={18} />
                  <span>Log Stock Transaction</span>
                </button>
              </div>
            )}
          </div>

          {/* Stocks Overview Cards */}
          <div className="grid grid-4" style={{ marginTop: '1.5rem' }}>
            {materials.length === 0 ? (
              <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '2rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)' }}>
                No materials registered. Add categories like Cement, Bricks, or Steel.
              </div>
            ) : (
              materials.map((mat) => (
                <div key={mat._id} className="card" style={{
                  ...styles.stockCard,
                  borderTop: `4px solid ${mat.remaining < 0 ? 'var(--alert-red)' : 'var(--primary-orange)'}`
                }}>
                  <span style={styles.stockCardName}>{mat.name}</span>
                  <div style={styles.stockCardValues}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={styles.stockCardValLabel}>Inward Total</span>
                      <h4>{mat.totalIn} {mat.unit}</h4>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={styles.stockCardValLabel}>Used Total</span>
                      <h4>{mat.totalUsed} {mat.unit}</h4>
                    </div>
                  </div>
                  <div style={styles.stockCardFooter}>
                    <span>Remaining Balance</span>
                    <strong style={{
                      color: mat.remaining < 0 ? 'var(--alert-red)' : 'var(--dark-graphite)',
                      fontSize: '1.25rem'
                    }}>{mat.remaining} {mat.unit}</strong>
                  </div>
                  {mat.remaining < 0 && (
                    <div style={{ color: 'var(--alert-red)', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.5rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <AlertTriangle size={12} /> Discrepancy warning triggered!
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Audit Logs Table */}
          <div style={{ marginTop: '2.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Stock Modification Audits (Fraud Prevention)</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Audit Details / Notes</th>
                    <th>Authorized By</th>
                  </tr>
                </thead>
                <tbody>
                  {materialLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No stock logs recorded.</td>
                    </tr>
                  ) : (
                    materialLogs.map((log) => (
                      <tr key={log._id}>
                        <td>{new Date(log.date).toLocaleString()}</td>
                        <td><strong>{log.materialId?.name}</strong></td>
                        <td>
                          <span className={`badge ${log.type === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {log.type === 'IN' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            {log.type}
                          </span>
                        </td>
                        <td>{log.quantity} {log.materialId?.unit}</td>
                        <td>{log.note || '—'}</td>
                        <td>{log.createdBy?.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. EXPENSES LEDGER TAB */}
      {activeTab === 'expenses' && (
        <div style={styles.tabContent}>
          <div style={styles.tabActions}>
            <div>
              <h3>Project Bills & Expenses</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {user?.role === 'contractor'
                  ? 'Submit expenses with receipts for owner approval. Pending items do not affect approved spent budget.'
                  : 'Review contractor-submitted expenses. Only approved expenses count toward actual spent budget.'}
              </p>
            </div>
            <button onClick={() => setShowExpenseModal(true)} className="btn btn-primary">
              <Plus size={18} />
              <span>{user?.role === 'contractor' ? 'Submit Expense for Approval' : 'Record Expense'}</span>
            </button>
          </div>

          {actionMessage && (
            <div style={{ backgroundColor: 'rgba(39, 174, 96, 0.1)', color: 'var(--success-green)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem', fontWeight: '500' }}>
              {actionMessage}
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Amount (Rs)</th>
                    <th>Description</th>
                    <th>Entered By</th>
                    <th>Status</th>
                    {(isOwner || isManager || user?.role === 'admin') && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expenses recorded.</td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp._id}>
                        <td>{new Date(exp.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-info`}>{exp.category}</span>
                        </td>
                        <td><strong>{exp.amount.toLocaleString()}</strong></td>
                        <td>
                          <div>{exp.description}</div>
                          {exp.rejectionReason && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--alert-red)' }}>Reason: {exp.rejectionReason}</div>
                          )}
                        </td>
                        <td>
                          <div>{exp.addedBy?.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{exp.addedBy?.role}</div>
                        </td>
                        <td>
                          <span className={`badge ${
                            exp.status === 'approved' ? 'badge-success' :
                            exp.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {exp.status || 'approved'}
                          </span>
                        </td>
                        {(isOwner || isManager || user?.role === 'admin') && (
                          <td>
                            {exp.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleReviewExpense(exp._id, 'approved')}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success-green)', color: 'var(--success-green)' }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewExpense(exp._id, 'rejected')}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--alert-red)', color: 'var(--alert-red)' }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {exp.reviewedBy ? `Reviewed by ${exp.reviewedBy.name}` : 'Settled'}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONTRACTS & PAYMENTS TAB */}
      {activeTab === 'contracts' && (
        <div style={styles.tabContent}>
          <div style={styles.tabActions}>
            <div>
              <h3>Contract & Payment Milestones</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Contract agreements, payment releases, and disbursed amounts.
              </p>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: '1.5rem', gap: '2rem' }}>
            {/* Contract Terms Box */}
            <div className="card">
              <h4>Contract Agreement</h4>
              {projectContract ? (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contractor:</span>
                    <strong>{projectContract.contractorId?.name || 'Assigned Contractor'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Contract Amount:</span>
                    <strong>Rs {projectContract.contractAmount.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contract Status:</span>
                    <span className="badge badge-success">{projectContract.status}</span>
                  </div>
                  {projectContract.terms && (
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Terms & Scope:</span>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{projectContract.terms}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No contract terms specified yet.</p>
                  {(isOwner || isManager || user?.role === 'admin') && (
                    <form onSubmit={handleSaveContract} style={{ marginTop: '1rem' }}>
                      <div className="form-group">
                        <label>Contract Amount (PKR)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="e.g. 4500000"
                          value={contractAmountInput}
                          onChange={(e) => setContractAmountInput(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Terms & Conditions</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Scope of work, milestone delivery expectations..."
                          value={contractTermsInput}
                          onChange={(e) => setContractTermsInput(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                        Save Contract Terms
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Record Payment Box (Owners) */}
            <div className="card">
              <h4>Disburse Contractor Payment</h4>
              {(isOwner || isAccountant || user?.role === 'admin') ? (
                <form onSubmit={handleRecordPayment} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Payment Amount (PKR)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 500000"
                      value={paymentAmountInput}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      className="form-control"
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                    >
                      <option value="bank_transfer">Bank Transfer / IBFT</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reference / Cheque Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. TXN-984213 or Cheque #0045"
                      value={paymentRefInput}
                      onChange={(e) => setPaymentRefInput(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                    Record Disbursed Payment
                  </button>
                </form>
              ) : (
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                  Payments can only be disbursed and recorded by the Company Owner or Accountant.
                </p>
              )}
            </div>
          </div>

          {/* Payment History Table */}
          <div style={{ marginTop: '2.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Payment Disbursements History</h4>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Contractor</th>
                    <th>Amount (PKR)</th>
                    <th>Payment Method</th>
                    <th>Reference</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {projectPayments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payments released yet.</td>
                    </tr>
                  ) : (
                    projectPayments.map((p) => (
                      <tr key={p._id}>
                        <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td>{p.contractorId?.name || 'Contractor'}</td>
                        <td><strong>Rs {p.amount.toLocaleString()}</strong></td>
                        <td><span className="badge badge-info">{p.paymentMethod}</span></td>
                        <td>{p.referenceNumber || 'N/A'}</td>
                        <td>{p.recordedBy?.name || 'Admin'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. CONTRACTOR ASSIGNMENTS TAB (Owner Only) */}
      {activeTab === 'contractors' && (
        <div style={styles.tabContent}>
          <div style={styles.tabActions}>
            <div>
              <h3>Contractor Access Control (Project Security)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Contractors only see projects where they have an active assignment.
              </p>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: '1.5rem', gap: '2rem' }}>
            {/* Assign Contractor Form */}
            <div className="card">
              <h4>Assign Contractor to this Site</h4>
              <form onSubmit={handleAssignContractor} style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Select Company Contractor</label>
                  <select
                    className="form-control"
                    value={selectedContractorToAssign}
                    onChange={(e) => setSelectedContractorToAssign(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Contractor --</option>
                    {companyContractors.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Grant Project Access
                </button>
              </form>
            </div>

            {/* Currently Assigned Contractors */}
            <div className="card">
              <h4>Currently Assigned to {dashboardData.projectName}</h4>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dashboardData.assignedContractors?.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No contractors currently assigned to this project site.</p>
                ) : (
                  dashboardData.assignedContractors.map((ac) => (
                    <div
                      key={ac._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-light)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div>
                        <strong>{ac.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ac.email}</div>
                      </div>
                      <button
                        onClick={() => handleRevokeContractor(ac._id)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--alert-red)', color: 'var(--alert-red)' }}
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIALOG POPUPS */}
      
      {/* 1. Add Worker Profile Modal */}
      {showWorkerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add Worker Profile</h2>
            <button onClick={() => setShowWorkerModal(false)} className="modal-close">×</button>
            <form onSubmit={handleAddWorker} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Worker Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Akbar Ali"
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role / Trade</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mason, Helper, Carpenter"
                  value={wRole}
                  onChange={(e) => setWRole(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Daily Wage Rate (PKR)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 1500"
                  value={wWage}
                  onChange={(e) => setWWage(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 03001234567"
                  value={wPhone}
                  onChange={(e) => setWPhone(e.target.value)}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowWorkerModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Register Material Modal */}
      {showMaterialModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Register Material Category</h2>
            <button onClick={() => setShowMaterialModal(false)} className="modal-close">×</button>
            <form onSubmit={handleAddMaterial} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Material Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Cement, Steel, Bricks"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Inventory Unit</label>
                <select 
                  className="form-control"
                  value={mUnit}
                  onChange={(e) => setMUnit(e.target.value)}
                >
                  <option value="bags">Bags (cement)</option>
                  <option value="kg">Kilograms (steel/nails)</option>
                  <option value="ton">Tons (aggregate/steel)</option>
                  <option value="pieces">Pieces (bricks/tiles)</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowMaterialModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Log Stock Transaction Modal */}
      {showMaterialLogModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Log Stock Transaction</h2>
            <button onClick={() => setShowMaterialLogModal(false)} className="modal-close">×</button>
            <form onSubmit={handleLogMaterial} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Select Material</label>
                <select 
                  className="form-control"
                  value={mlId}
                  onChange={(e) => setMlId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Material --</option>
                  {materials.map(m => (
                    <option key={m._id} value={m._id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Transaction Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textTransform: 'none', fontWeight: 'normal' }}>
                    <input type="radio" name="mlType" value="IN" checked={mlType === 'IN'} onChange={() => setMlType('IN')} />
                    Stock Incoming (IN)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textTransform: 'none', fontWeight: 'normal' }}>
                    <input type="radio" name="mlType" value="OUT" checked={mlType === 'OUT'} onChange={() => setMlType('OUT')} />
                    Usage on Site (OUT)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 50"
                  value={mlQty}
                  onChange={(e) => setMlQty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Auditing Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Supplier bill ref or site block usage"
                  value={mlNote}
                  onChange={(e) => setMlNote(e.target.value)}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowMaterialLogModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Log Audit Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Log Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Record Expense Item</h2>
            <button onClick={() => setShowExpenseModal(false)} className="modal-close">×</button>
            <form onSubmit={handleAddExpenseSubmit} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Expense Category</label>
                <select 
                  className="form-control"
                  value={eCategory}
                  onChange={(e) => setECategory(e.target.value)}
                >
                  <option value="labor">Labor wages</option>
                  <option value="material">Material purchases</option>
                  <option value="transport">Transport / Logistics</option>
                  <option value="misc">Miscellaneous</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount (PKR)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 25000"
                  value={eAmount}
                  onChange={(e) => setEAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Bill Description</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Purchased 10 cement bags"
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Log Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Daily Site Report Modal (with Urdu Voice Input Simulation) */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', width: '90%' }}>
            <h2>Daily Work Log & Vision AI Upload</h2>
            <button onClick={() => setShowReportModal(false)} className="modal-close">×</button>
            
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
              {/* Left Column: Voice Assistant */}
              <div style={{ flex: '1 1 320px', backgroundColor: 'var(--bg-light)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Mic size={18} style={{ color: 'var(--primary-orange)' }} />
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Urdu Voice Assistant (Smart Site Entry)
                  </h4>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                  Choose a Roman Urdu site log description. The AI translator will convert it to formatted English logs automatically.
                </p>
                
                <div style={styles.voiceButtonsList}>
                  {urduPhrases.map((phrase, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      onClick={() => handleVoiceSimulate(phrase)} 
                      style={styles.voiceSimBtn}
                      disabled={isRecording}
                    >
                      "{phrase.urdu}"
                    </button>
                  ))}
                </div>

                {isRecording && (
                  <div style={styles.recordingState}>
                    <span style={styles.recordingPulse}></span>
                    <span>Transcribing Voice Memo: "{selectedUrduPhrase}"</span>
                  </div>
                )}
              </div>

              {/* Right Column: Form */}
              <form onSubmit={handleAddReportSubmit} style={{ flex: '1 2 420px', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Work Stage / Type</label>
                  <select 
                    className="form-control"
                    value={rWorkType}
                    onChange={(e) => setRWorkType(e.target.value)}
                  >
                    <option value="Foundation">Foundation work</option>
                    <option value="Structure">Structure building</option>
                    <option value="Slab">Slab casting</option>
                    <option value="Finishing">Finishing & painting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Work Description Log</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Describe today's activities, issues, or completed tasks..."
                    value={rDesc}
                    onChange={(e) => setRDesc(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Site Capture (Upload from Gallery)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      id="site-photo-file"
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <label 
                        htmlFor="site-photo-file" 
                        className="btn btn-outline" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}
                      >
                        <Camera size={18} />
                        <span>Choose Photo(s)</span>
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setRImages(['https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80'])}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem 0.75rem' }}
                      >
                        Mock URL
                      </button>
                    </div>

                    {/* Preview Selected Photos */}
                    {rImages.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {rImages.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button 
                              type="button" 
                              onClick={() => handleRemoveImage(idx)} 
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                background: 'rgba(235, 87, 87, 0.8)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ ...styles.modalActions, marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowReportModal(false)} className="btn btn-outline">Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Daily Log</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1.5rem',
  },
  subText: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  projectTitle: {
    fontSize: '1.85rem',
    color: 'var(--dark-graphite)',
  },
  projectHeaderStats: {
    display: 'flex',
    gap: '2.5rem',
  },
  headerStatBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerStatLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.25rem',
  },
  headerStatValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--dark-graphite)',
  },
  completeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    backgroundColor: 'var(--success-green)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-fast)',
  },
  tabsContainer: {
    display: 'flex',
    borderBottom: '2px solid var(--border-color)',
    gap: '2rem',
    marginTop: '-1rem',
  },
  tabButton: {
    border: 'none',
    background: 'none',
    padding: '0.75rem 0',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'color var(--transition-fast)',
  },
  activeTabButton: {
    color: 'var(--primary-orange)',
    borderBottom: '3px solid var(--primary-orange)',
    marginBottom: '-2px',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    animation: 'fadeIn 0.2s ease',
  },
  metricCard: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  progressBgSection: {
    margin: '1.5rem 0',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  progressBarBg: {
    height: '10px',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '50px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '50px',
    transition: 'width 0.4s ease',
  },
  categoryStatsContainer: {
    marginTop: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  categoryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--bg-light)',
  },
  noAlerts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1.5rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  alertItem: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  alertMsg: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--dark-graphite)',
  },
  alertDate: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  alertReadBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--steel-blue)',
    fontWeight: '600',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  tabActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noDataBox: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-muted)',
  },
  reportCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
  },
  reportAuthor: {
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  reportDate: {
    color: 'var(--text-muted)',
  },
  reportDesc: {
    fontSize: '0.95rem',
    color: 'var(--dark-graphite)',
    lineHeight: '1.6',
  },
  aiWidget: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    borderLeft: '4px solid',
    marginTop: '0.5rem',
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  imageBox: {
    height: '120px',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '2rem',
  },
  loading: {
    textAlign: 'center',
    padding: '4rem',
    color: 'var(--text-muted)',
  },
  attBtn: {
    padding: '0.35rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  stockCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1.25rem',
  },
  stockCardName: {
    fontWeight: '600',
    fontSize: '1rem',
    color: 'var(--dark-graphite)',
  },
  stockCardValues: {
    display: 'flex',
    justifyContent: 'space-around',
    backgroundColor: 'var(--bg-light)',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
  },
  stockCardValLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '2px',
  },
  stockCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginTop: 'auto',
  },
  voiceAssistantBox: {
    backgroundColor: 'var(--bg-light)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    marginBottom: '1rem',
  },
  voiceButtonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  voiceSimBtn: {
    textAlign: 'left',
    background: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: 'var(--dark-graphite-text)',
    transition: 'border-color var(--transition-fast)',
    ':hover': {
      borderColor: 'var(--primary-orange)',
    },
  },
  recordingState: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.75rem',
    fontSize: '0.8rem',
    color: 'var(--primary-orange)',
    fontWeight: '600',
  },
  recordingPulse: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-orange)',
    animation: 'fadeIn 0.5s infinite alternate',
  },
  tabErrorAlert: {
    backgroundColor: 'var(--alert-red-light)',
    color: 'var(--alert-red)',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
};

export default ProjectDetail;
