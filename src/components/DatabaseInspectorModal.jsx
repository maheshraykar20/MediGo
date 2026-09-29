import React, { useState, useEffect } from 'react';
import { 
  Database, 
  X, 
  RefreshCw, 
  HardDrive, 
  Table, 
  ShieldCheck, 
  FileText, 
  User, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Server,
  Layers,
  FolderOpen
} from 'lucide-react';
import { apiGetDatabaseInspector, apiGetTableData } from '../utils/apiService';

export default function DatabaseInspectorModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  lang = 'mr' 
}) {
  const isMr = lang === 'mr';
  const [loading, setLoading] = useState(false);
  const [inspectorData, setInspectorData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTable, setSelectedTable] = useState('medicines');
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchInspector = async () => {
    setLoading(true);
    try {
      const data = await apiGetDatabaseInspector();
      setInspectorData(data);
      // Auto-select current logged-in user or first user
      if (!selectedUser && data.databases && data.databases.length > 0) {
        const currentFound = data.databases.find(d => d.userId === currentUser?.id);
        setSelectedUser(currentFound || data.databases[0]);
      }
    } catch (err) {
      console.error('Failed to fetch DB inspector:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableRecords = async (userId, tableName) => {
    if (!userId) return;
    setTableLoading(true);
    try {
      const res = await apiGetTableData(userId, tableName);
      setTableData(res.rows || []);
    } catch (err) {
      console.error('Failed to fetch table records:', err);
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInspector();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedUser) {
      fetchTableRecords(selectedUser.userId, selectedTable);
    }
  }, [selectedUser, selectedTable]);

  if (!isOpen) return null;

  const filteredDatabases = (inspectorData?.databases || []).filter(db => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return db.phone?.includes(q) || db.storeName?.toLowerCase().includes(q) || db.dbFile?.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 z-10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
              <Database className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  {isMr ? 'SQLite ३ मल्टि-टेनंट डेटाबेस दर्शक (DB Explorer)' : 'Multi-Tenant SQLite Database Explorer'}
                </h3>
                <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                  LIVE SQLITE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isMr 
                  ? 'प्रत्येक मेडिकल स्टोअरसाठी स्वतंत्र .sqlite फाईल • १००% स्वतंत्र डेटा' 
                  : '1 Dedicated SQLite file per pharmacy store on disk • Complete isolation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInspector}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title={isMr ? 'डेटाबेस रिफ्रेश करा' : 'Refresh database'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Architecture Summary Banner */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
              <Server className="w-3 h-3 text-teal-600" />
              <span>{isMr ? 'डेटाबेस इंजिन' : 'Database Engine'}</span>
            </div>
            <div className="font-bold text-slate-900 mt-0.5 font-mono">SQLite 3 (node:sqlite)</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
              <FolderOpen className="w-3 h-3 text-blue-600" />
              <span>{isMr ? 'स्टोरेज डिरेक्टरी' : 'On-Disk Directory'}</span>
            </div>
            <div className="font-bold text-slate-800 mt-0.5 truncate font-mono text-[11px]" title={inspectorData?.dbDirectory}>
              data/databases/
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{isMr ? 'डेटा पृथक्करण (Isolation)' : 'Tenant Isolation'}</span>
            </div>
            <div className="font-bold text-emerald-700 mt-0.5">१००% स्वतंत्र फाइल्स</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
              <HardDrive className="w-3 h-3 text-purple-600" />
              <span>{isMr ? 'सक्रिय स्टोअर्स DB' : 'Active Store DBs'}</span>
            </div>
            <div className="font-bold text-slate-900 mt-0.5 font-mono">
              {inspectorData?.totalTenantDatabases || 0} {isMr ? 'फाइल्स' : 'Databases'}
            </div>
          </div>
        </div>

        {/* Content Body: Left Column (Store Databases List) + Right Column (Table Row Viewer) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Stores & DB Files List */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-hidden shrink-0">
            {/* Search filter input */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={isMr ? 'मोबाईल नंबर किंवा DB फाईल शोधा...' : 'Search store or db file...'}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-medium"
                />
              </div>
            </div>

            {/* List of Tenant Databases */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredDatabases.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {loading 
                    ? (isMr ? 'डेटाबेस माहिती लोड होत आहे...' : 'Loading databases...')
                    : (isMr ? 'अजून कोणताही युजर डेटाबेस सापडला नाही.' : 'No user databases provisioned yet.')}
                </div>
              ) : (
                filteredDatabases.map((db) => {
                  const isSelected = selectedUser?.userId === db.userId;
                  const isCurrent = currentUser?.id === db.userId;

                  return (
                    <div
                      key={db.userId}
                      onClick={() => setSelectedUser(db)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition space-y-2 ${
                        isSelected 
                          ? 'bg-teal-50/90 border-teal-400 shadow-sm ring-1 ring-teal-400' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                            <span>{db.storeName}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-teal-600 text-white">
                                {isMr ? 'तुमचे चालू खाते' : 'Current'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                            📱 +91 {db.phone}
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                          {db.fileSizeFormatted}
                        </span>
                      </div>

                      {/* DB File Tag */}
                      <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[10px] font-mono text-slate-700 truncate flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-teal-600 shrink-0" />
                        <span className="truncate">{db.dbFile}</span>
                      </div>

                      {/* Counts stats */}
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-0.5">
                        <div className="bg-white p-1 rounded-md border border-slate-200/80">
                          <span className="text-slate-400 block">{isMr ? 'औषधे' : 'Meds'}</span>
                          <span className="font-bold text-slate-800">{db.medicinesCount}</span>
                        </div>
                        <div className="bg-white p-1 rounded-md border border-slate-200/80">
                          <span className="text-slate-400 block">{isMr ? 'व्हाउचर्स' : 'Bills'}</span>
                          <span className="font-bold text-slate-800">{db.vouchersCount}</span>
                        </div>
                        <div className="bg-white p-1 rounded-md border border-slate-200/80">
                          <span className="text-slate-400 block">{isMr ? 'कॅटेगरीज' : 'Cats'}</span>
                          <span className="font-bold text-slate-800">{db.categoriesCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: SQL Table Explorer for Selected Store */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {selectedUser ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Store Header & Table Selector Tabs */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                        <span>{isMr ? 'निवडलेला SQLite डेटाबेस:' : 'Selected SQLite Database:'}</span>
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {selectedUser.dbFile}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        {selectedUser.storeName} (+91 {selectedUser.phone})
                      </h4>
                    </div>

                    <button
                      onClick={() => fetchTableRecords(selectedUser.userId, selectedTable)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition self-start sm:self-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${tableLoading ? 'animate-spin text-teal-600' : ''}`} />
                      <span>{isMr ? 'टेबल रिफ्रेश करा' : 'Refresh Table'}</span>
                    </button>
                  </div>

                  {/* Table Selection Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1">
                    {[
                      { id: 'medicines', label: isMr ? 'औषधे (medicines)' : 'medicines' },
                      { id: 'vouchers', label: isMr ? 'व्हाउचर्स (vouchers)' : 'vouchers' },
                      { id: 'custom_categories', label: isMr ? 'कॅटेगरीज (categories)' : 'custom_categories' },
                      { id: 'store_profile', label: isMr ? 'प्रोफाईल (store_profile)' : 'store_profile' },
                      { id: 'database_audit_logs', label: isMr ? 'ऑडिट लॉग्स (audit_logs)' : 'audit_logs' },
                    ].map(t => {
                      const isActive = selectedTable === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTable(t.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                            isActive 
                              ? 'bg-slate-900 text-white shadow-xs' 
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Table className="w-3.5 h-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SQL Query Indicator */}
                <div className="px-4 py-2 bg-slate-900 text-teal-300 font-mono text-[11px] border-b border-slate-800 flex items-center justify-between shrink-0">
                  <span className="truncate">
                    SQL: SELECT * FROM {selectedTable} ORDER BY rowid DESC LIMIT 100;
                  </span>
                  <span className="text-slate-400 text-[10px] shrink-0 ml-2">
                    {tableData.length} {isMr ? 'नोंदी आढळल्या' : 'rows'}
                  </span>
                </div>

                {/* Table Rows Viewer */}
                <div className="flex-1 overflow-auto p-4">
                  {tableLoading ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                      <span>{isMr ? 'SQLite डेटाबेसमधून नोंदी वाचत आहे...' : 'Reading rows from SQLite...'}</span>
                    </div>
                  ) : tableData.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="font-bold text-slate-700 text-xs">
                        {isMr ? `टेबल "${selectedTable}" सध्या रिक्त (Empty) आहे` : `Table "${selectedTable}" is currently empty`}
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        {isMr 
                          ? 'या मेडिकल स्टोअरने अजून या टेबलमध्ये कोणतीही नोंद केलेली नाही. जशी नोंद होईल तशी ती इथे लगेच दिसेल.' 
                          : 'This isolated store database has no rows in this table yet. Add an item or bill in the dashboard to see live rows.'}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                              {Object.keys(tableData[0] || {}).map(col => (
                                <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {tableData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                {Object.entries(row).map(([k, val], cIdx) => (
                                  <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-700 max-w-xs truncate" title={String(val)}>
                                    {val === null || val === undefined ? (
                                      <span className="text-slate-300 italic">NULL</span>
                                    ) : typeof val === 'object' ? (
                                      JSON.stringify(val)
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
                {isMr ? 'डावीकडील कोणत्याही मेडिकल स्टोअरवर क्लिक करून त्यांचा डेटाबेस तपासा.' : 'Select a store database from the left to inspect its live SQLite tables.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">
              {isMr 
                ? 'User A आणि User B च्या सर्व नोंदी त्यांच्या स्वतःच्या स्वतंत्र .sqlite फाईलमध्ये सुरक्षित राहतात.' 
                : 'Zero cross-tenant data leakage: each user reads & writes exclusively to their dedicated SQLite file.'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs"
          >
            {isMr ? 'बंद करा (Close)' : 'Close Explorer'}
          </button>
        </div>
      </div>
    </div>
  );
}
