import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { fvGetDoc } from "@/lib/fileverseStore";
import { FileText, Download, Shield, X } from "lucide-react";
import { motion } from "framer-motion";

const DDocViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!id) return;
      try {
        const raw = await fvGetDoc(id);
        setContent(raw);
      } catch (err) {
        console.error("Failed to fetch dDoc", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-mono text-gray-400">Loading Fileverse dDoc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Portal Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg shadow-primary/20">
            A
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none mb-1">Fileverse Portal Preview</h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">Document ID: {id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Sync Alpha</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all shadow-md">
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </header>

      {/* Document Body */}
      <main className="flex-1 p-6 md:p-12 lg:p-20 flex justify-center bg-gray-100/30">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[850px] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-gray-200 min-h-full p-12 md:p-20 rounded-sm relative"
        >
          {/* Subtle Document Header Items */}
          <div className="flex justify-between items-start mb-16">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Status: Finalized</div>
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Network: Base Sepolia</div>
            </div>
            <div className="text-right">
              <Shield className="w-8 h-8 text-primary/10 ml-auto mb-2" />
              <div className="text-[8px] font-mono text-gray-300 uppercase tracking-widest">AetherGuard Protocol v2</div>
            </div>
          </div>

          {/* Markdown Rendering (Manual Parser) */}
          <article className="prose prose-slate max-w-none 
            prose-headings:text-gray-900 prose-headings:font-black
            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
            prose-strong:text-gray-900 prose-strong:font-bold
            prose-blockquote:border-primary prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:italic
            prose-hr:border-gray-100 prose-hr:my-12
            prose-li:text-gray-700 prose-li:mb-2
          ">
            {(() => {
              const lines = content.split('\n');
              const rendered = [];
              let i = 0;
              
              while (i < lines.length) {
                const line = lines[i];

                // Table Detection
                if (line.trim().startsWith('|') && lines[i+1]?.trim().startsWith('|') && lines[i+1]?.includes('---')) {
                  const headerRow = line;
                  const separatorRow = lines[i+1];
                  const dataRows = [];
                  let j = i + 2;
                  while (j < lines.length && lines[j].trim().startsWith('|')) {
                    dataRows.push(lines[j]);
                    j++;
                  }
                  
                  const parsePipe = (row: string) => row.split('|').filter(c => c.trim() !== '' || row.indexOf(c) > 0 && row.indexOf(c) < row.length - 1).map(c => c.trim());
                  const headers = parsePipe(headerRow);
                  
                  rendered.push(
                    <div key={`table-${i}`} className="my-8 overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {headers.map((h, hi) => <th key={hi} className="px-4 py-3 text-left font-black text-gray-900 uppercase tracking-wider">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {dataRows.map((dr, dri) => (
                            <tr key={dri} className="hover:bg-gray-50/50 transition-colors">
                              {parsePipe(dr).map((d, di) => <td key={di} className="px-4 py-3 text-gray-700 whitespace-nowrap">{d}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                  i = j;
                  continue;
                }

                if (line.startsWith('# ')) {
                  rendered.push(<h1 key={i} className="text-4xl mb-8 border-b-2 pb-6 border-gray-100">{line.substring(2)}</h1>);
                } else if (line.startsWith('## ')) {
                  rendered.push(<h2 key={i} className="text-2xl mt-12 mb-6 flex items-center gap-3">{line.substring(3)}</h2>);
                } else if (line.startsWith('### ')) {
                  rendered.push(<h3 key={i} className="text-lg font-bold mt-8 mb-4 text-gray-800">{line.substring(4)}</h3>);
                } else if (line.startsWith('---')) {
                  rendered.push(<hr key={i} className="my-12" />);
                } else if (line.startsWith('> ')) {
                  rendered.push(<blockquote key={i} className="my-8">{line.substring(2)}</blockquote>);
                } else if (line.startsWith('- ')) {
                  rendered.push(<li key={i} className="ml-6 mb-2 list-disc pl-2">{line.substring(2)}</li>);
                } else if (line.trim() === '') {
                  rendered.push(<div key={i} className="h-4" />);
                } else {
                  rendered.push(
                    <p key={i} className="mb-4">
                      {line.split(/(\*\*.*?\*\*|`.*?`)/).map((part, pi) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={pi}>{part.substring(2, part.length - 2)}</strong>;
                        }
                        if (part.startsWith('`') && part.endsWith('`')) {
                          return <code key={pi} className="bg-gray-100 px-1.5 py-0.5 rounded text-primary font-mono text-[0.9em]">{part.substring(1, part.length - 1)}</code>;
                        }
                        return part;
                      })}
                    </p>
                  );
                }
                i++;
              }
              return rendered;
            })()}
          </article>

          {/* Verification Footer */}
          <div className="mt-32 pt-12 border-t border-gray-100">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verified Multi-Sig Establishment</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono max-w-sm">
                This document is cryptographically referenced by the AetherGuard Index and secured by Fileverse dDoc technology.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 px-12 text-center">
        <p className="text-xs text-gray-400 font-medium">AetherGuard AI Portfolio Guardian • Ethical AI Finance</p>
      </footer>
    </div>
  );
};

export default DDocViewer;
