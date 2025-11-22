// src/components/Input.jsx
import React from 'react';

export default function Input({ label, type, value, onChange, placeholder, required }) {
  return (
    <div className="mb-4">
      <label className="block text-[--neon-blue] text-xs font-bold mb-2 tracking-wider uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#1e293b] text-white border border-slate-600 rounded p-3 
                   focus:outline-none focus:border-[--neon-blue] focus:ring-1 focus:ring-[--neon-blue] 
                   transition-all duration-300 font-mono placeholder-slate-500"
      />
    </div>
  );
}