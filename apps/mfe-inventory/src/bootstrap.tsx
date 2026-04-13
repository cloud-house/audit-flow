import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProjectListPage from './project/pages/ProjectListPage';
import ProjectDetailPage from './project/pages/ProjectDetailPage';

// Standalone dev mode — renders without the Shell
const root = document.getElementById('root');
if (!root) throw new Error('#root not found');
createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
    </Routes>
  </BrowserRouter>,
);
