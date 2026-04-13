import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReportPage from './report/pages/ReportPage';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');
createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="*" element={<ReportPage />} />
    </Routes>
  </BrowserRouter>,
);
