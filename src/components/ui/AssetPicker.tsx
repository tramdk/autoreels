import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon, Search, CheckCircle2, History as HistoryIcon } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';

interface Asset {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

interface AssetPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export const AssetPicker: React.FC<AssetPickerProps> = ({ onSelect, onClose }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const data = await api.getAssets();
      setAssets(data);
    } catch (err) {
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const tid = toast.loading('Processing asset...');
    try {
      const res = await api.uploadAsset(file);
      toast.success('Asset ready', { id: tid });
      onSelect(res.url);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: tid });
    } finally {
      setUploading(false);
    }
  };

  const filtered = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="glass w-full max-w-4xl h-[80vh] flex flex-col rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
           <div>
             <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
               <ImageIcon className="w-6 h-6 text-pink-500" />
               MEDIA <span className="text-slate-500 font-medium">LIBRARY</span>
             </h2>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Intelligent Asset Management</p>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Upload & Filters */}
          <div className="w-72 border-r border-white/5 p-6 space-y-8 bg-black/20">
             <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Quick Action</label>
               <div className="relative group">
                 <input 
                   type="file" 
                   accept="image/*,video/*"
                   disabled={uploading}
                   onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                   className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed" 
                 />
                 <div className={`w-full h-32 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${uploading ? 'border-pink-500/20 bg-pink-500/5' : 'border-white/10 group-hover:border-pink-500/50 bg-white/5 group-hover:bg-pink-500/5'}`}>
                   {uploading ? (
                     <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <Upload className="w-6 h-6 text-slate-500 group-hover:text-pink-500 transition-colors" />
                   )}
                   <span className="text-[10px] font-black text-slate-500 uppercase group-hover:text-pink-500">{uploading ? 'Processing...' : 'Upload Local'}</span>
                 </div>
               </div>
             </div>

             <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Search</label>
               <div className="relative">
                 <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input 
                    type="text" 
                    placeholder="Find assets..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-xs text-white outline-none focus:border-pink-500/50"
                 />
               </div>
             </div>

             <div className="pt-8 border-t border-white/5">
                <div className="flex items-center gap-2 text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-[9px] font-bold uppercase">De-duplication Active</span>
                </div>
             </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             {loading ? (
               <div className="h-full flex items-center justify-center">
                 <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
             ) : filtered.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                 <HistoryIcon className="w-12 h-12" />
                 <span className="text-xs font-bold uppercase tracking-widest">No assets found</span>
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                 {filtered.map(asset => (
                   <motion.div 
                     key={asset.id}
                     whileHover={{ y: -5 }}
                     onClick={() => onSelect(asset.url)}
                     className="group cursor-pointer space-y-3"
                   >
                     <div className="aspect-square rounded-3xl bg-white/5 border border-white/5 overflow-hidden relative shadow-lg group-hover:shadow-pink-500/10 group-hover:border-pink-500/30 transition-all">
                        {asset.type === 'image' ? (
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800">
                             <ImageIcon className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                           <span className="bg-pink-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-xl">Use Asset</span>
                        </div>
                     </div>
                     <div className="px-1">
                        <p className="text-[10px] font-bold text-white truncate">{asset.name}</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase mt-0.5">{(asset.size / 1024 / 1024).toFixed(2)} MB</p>
                     </div>
                   </motion.div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
