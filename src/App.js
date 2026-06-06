import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const LOOKUP = {
  '0.085D|78-90F':[11.2,13.2,15.3,11.4,13.4,15.5],
  '0.085D|5-10C': [11.2,13.2,15.3,11.4,13.4,15.5],
  '0.085D|15C':   [10.6,12.5,14.4,10.8,12.7,14.6],
  '0.085D|25C':   [13.1,15.4,17.7,13.3,15.6,17.9],
  '0.11D|5-10C':  [8.0,9.3,10.8,8.1,9.5,11.0],
  '0.11D|15C':    [8.1,9.6,11.1,8.3,9.8,11.3],
  '0.11D|25C':    [10.6,12.5,14.7,10.8,12.7,14.9],
  '0.12D|25C':    [9.6,11.4,13.2,9.8,11.6,13.4],
  '0.12D|20C':    [11.3,13.3,15.6,11.5,13.5,15.8],
  '0.13D|15C':    [7.6,8.9,10.4,7.8,9.1,10.6],
  '0.13D|25C':    [8.6,10.2,11.9,8.8,10.4,12.1],
  '0.13D|35C':    [8.8,10.4,12.1,9.0,10.6,12.3],
  '0.145D|25C':   [9.0,10.8,12.6,9.3,11.0,12.8],
  '0.16D|25C':    [7.5,8.9,10.4,7.7,9.1,10.6],
  '0.16D|35C':    [8.0,9.5,11.0,8.3,9.8,11.3],
  '0.19D|28C':    [null,6.9,8.1,null,7.2,8.4],
  '0.22D|25C':    [null,5.7,6.5,null,6.0,6.9],
};
const CDI = {'2m':0,'17m':1,'147m':2};

function parseKey(text) {
  const p = text.trim().split('|');
  if (p.length !== 4) return null;
  const [rawD, h, b, c] = p;
  const dNum = rawD.replace('D','');
  let density;
  if (dNum.startsWith('0')) density = '0.' + dNum.slice(1) + 'D';
  else density = '0.' + dNum + 'D';
  const cNum = c.replace('M','');
  let cd;
  if (cNum.length===1) cd = cNum+'M';
  else if (cNum.length===2) cd = cNum[0]+'.'+cNum[1]+'M';
  else cd = cNum[0]+'.'+cNum.slice(1)+'M';
  return { density, h, isHB: b==='HB', cd, key: text.trim() };
}

function calcPhuy(parsed, bun) {
  const k = parsed.density + '|' + parsed.h;
  const vals = LOOKUP[k];
  if (!vals) return null;
  const off = parsed.isHB ? 3 : 0;
  const cdK = parsed.cd.toLowerCase().replace('.','').replace('m','') + 'm';
  const idx = CDI[cdK] ?? 0;
  const bpp = vals[off+idx];
  if (!bpp) return null;
  return { phuy: bun/bpp, bpp };
}

const S = { // styles
  body: { minHeight:'100vh', background:'#0f1117', color:'#e8eaf0', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', padding:'0' },
  header: { background:'#181c27', borderBottom:'1px solid #2a2f3d', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' },
  hicon: { width:38, height:38, background:'#4f8ef7', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 },
  htitle: { fontSize:16, fontWeight:700 },
  hsub: { fontSize:11, color:'#6b7280', marginTop:2 },
  main: { padding:'20px 16px', maxWidth:520, margin:'0 auto' },
  card: { background:'#181c27', border:'1px solid #2a2f3d', borderRadius:14, padding:18, marginBottom:14 },
  lbl: { fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#6b7280', marginBottom:12 },
  btn: { width:'100%', padding:'15px', border:'none', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer', marginTop:8 },
  btnP: { background:'#4f8ef7', color:'#fff' },
  btnG: { background:'#2a2f3d', color:'#9ca3af' },
  btnR: { background:'#dc2626', color:'#fff' },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'10px 0' },
  box: { background:'#0f1117', borderRadius:8, padding:10, textAlign:'center' },
  boxL: { fontSize:10, color:'#6b7280', marginBottom:3 },
  boxV: { fontSize:17, fontWeight:700, color:'#4f8ef7', fontFamily:'monospace' },
  input: { width:'100%', padding:'18px', borderRadius:10, border:'2px solid #2a2f3d', background:'#0f1117', color:'#e8eaf0', fontSize:32, fontFamily:'monospace', textAlign:'center', outline:'none', boxSizing:'border-box' },
  result: { background:'linear-gradient(135deg,rgba(247,168,79,.15),rgba(79,142,247,.1))', border:'2px solid #f7a84f', borderRadius:14, padding:28, textAlign:'center' },
  big: { fontSize:72, fontWeight:700, color:'#f7a84f', fontFamily:'monospace', lineHeight:1 },
  fml: { fontSize:12, color:'#6b7280', marginTop:10, fontFamily:'monospace' },
  msg: { textAlign:'center', fontSize:13, fontFamily:'monospace', padding:'10px', borderRadius:8, marginTop:10, minHeight:20 },
};

export default function App() {
  const [step, setStep] = useState('scan'); // scan | info | result
  const [parsed, setParsed] = useState(null);
  const [bun, setBun] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannerIdRef = useRef('qr-reader');

  const startScan = async () => {
    if (scanning) return;
    setScanMsg('Đang bật camera...');
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;
      const cams = await Html5Qrcode.getCameras();
      if (!cams.length) throw new Error('Không tìm thấy camera');
      const cam = cams.find(c => /back|rear|env/i.test(c.label)) || cams[cams.length-1];
      await scanner.start(
        cam.id,
        { fps:10, qrbox:{width:220,height:220}, aspectRatio:1 },
        (text) => { onScan(text); },
        () => {}
      );
      setScanMsg('Hướng camera vào QR code giữa phiếu');
    } catch(e) {
      setScanMsg('❌ ' + e.message);
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch(e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const onScan = async (text) => {
    await stopScan();
    const p = parseKey(text);
    if (!p) {
      setScanMsg('⚠️ Scan QR ở giữa phiếu (phần hóa chất), không phải góc trên');
      return;
    }
    setParsed(p);
    setStep('info');
  };

  const reset = async () => {
    await stopScan();
    setParsed(null);
    setBun('');
    setScanMsg('');
    setStep('scan');
  };

  useEffect(() => {
    return () => { stopScan(); };
  }, []);

  const result = parsed && bun ? calcPhuy(parsed, parseFloat(bun)) : null;

  return (
    <div style={S.body}>
      <div style={S.header}>
        <div style={S.hicon}>🧪</div>
        <div>
          <div style={S.htitle}>Tra Cứu Số Phuy</div>
          <div style={S.hsub}>Scan QR phiếu pha liệu → tính số phuy</div>
        </div>
      </div>

      <div style={S.main}>
        {/* STEP 1: Scan */}
        {step === 'scan' && (
          <div style={S.card}>
            <div style={S.lbl}>Scan QR Code trên phiếu</div>
            <div id="qr-reader" style={{borderRadius:10,overflow:'hidden',background:'#000'}}></div>
            {scanMsg && (
              <div style={{...S.msg,
                color: scanMsg.startsWith('❌')||scanMsg.startsWith('⚠️') ? '#f75f4f' : scanMsg.startsWith('Hướng') ? '#4ff7a4' : '#f7a84f',
                background: scanMsg.startsWith('❌')||scanMsg.startsWith('⚠️') ? 'rgba(247,95,79,.08)' : scanMsg.startsWith('Hướng') ? 'rgba(79,247,164,.08)' : 'rgba(247,168,79,.08)'
              }}>{scanMsg}</div>
            )}
            {!scanning ? (
              <>
                <button style={{...S.btn,...S.btnP}} onClick={startScan}>📷 Bật Camera Scan</button>
                <button style={{...S.btn,...S.btnG}} onClick={() => {
                  const v = window.prompt('Nhập nội dung QR (key):');
                  if (v) onScan(v.trim());
                }}>⌨️ Nhập tay</button>
              </>
            ) : (
              <button style={{...S.btn,...S.btnR}} onClick={stopScan}>⏹ Dừng Camera</button>
            )}
          </div>
        )}

        {/* STEP 2: Info + Bun input */}
        {step === 'info' && parsed && (
          <>
            <div style={S.card}>
              <div style={S.lbl}>Thông tin phiếu</div>
              <div style={{fontFamily:'monospace',fontSize:13,color:'#6b7280',background:'#0f1117',padding:'6px 10px',borderRadius:6,marginBottom:12}}>{parsed.key}</div>
              <div style={S.grid}>
                <div style={S.box}><div style={S.boxL}>Density</div><div style={S.boxV}>{parsed.density}</div></div>
                <div style={S.box}><div style={S.boxL}>Hardness</div><div style={S.boxV}>{parsed.h}</div></div>
                <div style={S.box}><div style={S.boxL}>Loại</div><div style={S.boxV}>{parsed.isHB?'HB':'CSD/Nike'}</div></div>
                <div style={S.box}><div style={S.boxL}>Khổ</div><div style={S.boxV}>{parsed.cd}</div></div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.lbl}>Nhập số bun cần pha</div>
              <input
                type="number" inputMode="numeric"
                style={S.input} placeholder="0" value={bun}
                onChange={e => setBun(e.target.value)}
                autoFocus
              />
            </div>

            {result && (
              <div style={S.card}>
                <div style={S.lbl}>Số phuy cần pha</div>
                <div style={S.result}>
                  <div style={{fontSize:11,color:'#6b7280',letterSpacing:'0.1em',marginBottom:8}}>SỐ PHUY</div>
                  <div style={S.big}>{result.phuy.toFixed(2)}</div>
                  <div style={S.fml}>{bun} ÷ {result.bpp} = {result.phuy.toFixed(4)} phuy</div>
                </div>
              </div>
            )}

            {!result && bun && (
              <div style={{...S.card, textAlign:'center', color:'#f75f4f'}}>
                Không tìm thấy trong bảng tra
              </div>
            )}

            <button style={{...S.btn,...S.btnG,marginTop:0}} onClick={reset}>↩ Scan phiếu khác</button>
          </>
        )}
      </div>
    </div>
  );
}
