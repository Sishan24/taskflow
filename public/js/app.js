/**
 * TaskFlow Frontend Application
 * Reactive, modern SPA connecting directly to the TaskFlow REST API.
 */
(() => {
  // Application State
  const state = {
    token: localStorage.getItem('taskflow_token') || null,
    currentUser: null,
    projects: [],
    activeProjectId: localStorage.getItem('taskflow_active_project') || null,
    activeProject: null,
    tasks: [],
    activeTask: null,
    currentView: 'kanban', // 'kanban' | 'list'
    filters: {
      priority: '',
      sort: '-createdAt',
      search: '',
    },
  };

  // DOM Elements Cache
  const els = {
    app: document.getElementById('app'),
    toastContainer: document.getElementById('toastContainer'),
    // Auth Elements
    guestHero: document.getElementById('guestHero'),
    workspaceView: document.getElementById('workspaceView'),
    guestActions: document.getElementById('guestActions'),
    userActions: document.getElementById('userActions'),
    authOnlyEls: document.querySelectorAll('.auth-only'),
    adminOnlyEls: document.querySelectorAll('.admin-only'),
    // Modals
    authModal: document.getElementById('authModal'),
    projectModal: document.getElementById('projectModal'),
    taskModal: document.getElementById('taskModal'),
    membersModal: document.getElementById('membersModal'),
    // Auth Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    tabBtnLogin: document.getElementById('tabBtnLogin'),
    tabBtnRegister: document.getElementById('tabBtnRegister'),
    // Topbar Profile
    userAvatarBtn: document.getElementById('userAvatarBtn'),
    userProfileMenu: document.getElementById('userProfileMenu'),
    userInitials: document.getElementById('userInitials'),
    profileUserName: document.getElementById('profileUserName'),
    profileUserEmail: document.getElementById('profileUserEmail'),
    profileUserRole: document.getElementById('profileUserRole'),
    btnLogout: document.getElementById('btnLogout'),
    btnQuickDemoLogin: document.getElementById('btnQuickDemoLogin'),
    // Project Elements
    projectSelectBtn: document.getElementById('projectSelectBtn'),
    projectMenu: document.getElementById('projectMenu'),
    currentProjectTitle: document.getElementById('currentProjectTitle'),
    projectListItems: document.getElementById('projectListItems'),
    activeProjectTitleDisplay: document.getElementById('activeProjectTitleDisplay'),
    activeProjectDescDisplay: document.getElementById('activeProjectDescDisplay'),
    btnEditCurrentProject: document.getElementById('btnEditCurrentProject'),
    btnDeleteCurrentProject: document.getElementById('btnDeleteCurrentProject'),
    // Workspace Stats
    statTotalTasks: document.getElementById('statTotalTasks'),
    statTodoTasks: document.getElementById('statTodoTasks'),
    statProgressTasks: document.getElementById('statProgressTasks'),
    statDoneTasks: document.getElementById('statDoneTasks'),
    // Views
    btnViewKanban: document.getElementById('btnViewKanban'),
    btnViewList: document.getElementById('btnViewList'),
    kanbanBoardView: document.getElementById('kanbanBoardView'),
    listViewContainer: document.getElementById('listViewContainer'),
    columnTasksTodo: document.getElementById('columnTasksTodo'),
    columnTasksProgress: document.getElementById('columnTasksProgress'),
    columnTasksDone: document.getElementById('columnTasksDone'),
    countColTodo: document.getElementById('countColTodo'),
    countColProgress: document.getElementById('countColProgress'),
    countColDone: document.getElementById('countColDone'),
    tasksTableBody: document.getElementById('tasksTableBody'),
    // Toolbar Filters & Search
    globalSearchInput: document.getElementById('globalSearchInput'),
    filterPrioritySelect: document.getElementById('filterPrioritySelect'),
    sortTasksSelect: document.getElementById('sortTasksSelect'),
    btnRefreshWorkspace: document.getElementById('btnRefreshWorkspace'),
    // Drawer Elements
    taskDetailsDrawer: document.getElementById('taskDetailsDrawer'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    btnCloseDrawer: document.getElementById('btnCloseDrawer'),
    drawerTaskTitle: document.getElementById('drawerTaskTitle'),
    drawerTaskDesc: document.getElementById('drawerTaskDesc'),
    drawerTaskStatusBadge: document.getElementById('drawerTaskStatusBadge'),
    drawerTaskPriorityBadge: document.getElementById('drawerTaskPriorityBadge'),
    drawerTaskAssignee: document.getElementById('drawerTaskAssignee'),
    drawerTaskDueDate: document.getElementById('drawerTaskDueDate'),
    drawerTaskCreatedBy: document.getElementById('drawerTaskCreatedBy'),
    drawerTaskCreatedAt: document.getElementById('drawerTaskCreatedAt'),
    btnDrawerAdvanceStatus: document.getElementById('btnDrawerAdvanceStatus'),
    btnDrawerEditTask: document.getElementById('btnDrawerEditTask'),
    btnDrawerDeleteTask: document.getElementById('btnDrawerDeleteTask'),
    drawerCommentsList: document.getElementById('drawerCommentsList'),
    drawerCommentCount: document.getElementById('drawerCommentCount'),
    drawerCommentForm: document.getElementById('drawerCommentForm'),
    drawerCommentText: document.getElementById('drawerCommentText'),
    // Project Members
    btnOpenMembersModal: document.getElementById('btnOpenMembersModal'),
    addMemberForm: document.getElementById('addMemberForm'),
    memberEmailInput: document.getElementById('memberEmailInput'),
    projectMembersList: document.getElementById('projectMembersList'),
  };

  /**
   * API Client Helper
   */
  async function api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const response = await fetch(path, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && state.token) {
          showToast('Session expired. Please sign in again.', 'error');
          signOut();
        }
        throw new Error(data.message || 'An error occurred');
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Toast Notification
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /**
   * Modal Management
   */
  function openModal(modalEl) {
    modalEl.classList.remove('hidden');
  }

  function closeModal(modalEl) {
    modalEl.classList.add('hidden');
  }

  // Setup modal close triggers
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.getAttribute('data-close');
      const targetModal = document.getElementById(modalId);
      if (targetModal) closeModal(targetModal);
    });
  });

  /**
   * Authentication State Handlers
   */
  async function checkAuth() {
    if (!state.token) {
      renderUnauthenticated();
      return;
    }

    try {
      const res = await api('/api/users/me');
      state.currentUser = res.data.user;
      renderAuthenticated();
      await loadProjects();
    } catch (err) {
      signOut();
    }
  }

  function renderAuthenticated() {
    els.guestHero.classList.add('hidden');
    els.workspaceView.classList.remove('hidden');
    els.guestActions.classList.add('hidden');
    els.userActions.classList.remove('hidden');
    els.authOnlyEls.forEach((el) => el.classList.remove('hidden'));

    // Update profile info
    if (state.currentUser) {
      const initials = state.currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      els.userInitials.textContent = initials || 'TF';
      els.profileUserName.textContent = state.currentUser.name;
      els.profileUserEmail.textContent = state.currentUser.email;
      els.profileUserRole.textContent = state.currentUser.role.toUpperCase();

      if (state.currentUser.role === 'admin') {
        els.adminOnlyEls.forEach((el) => el.classList.remove('hidden'));
      }
    }
  }

  function renderUnauthenticated() {
    els.guestHero.classList.remove('hidden');
    els.workspaceView.classList.add('hidden');
    els.guestActions.classList.remove('hidden');
    els.userActions.classList.add('hidden');
    els.authOnlyEls.forEach((el) => el.classList.add('hidden'));
    els.adminOnlyEls.forEach((el) => el.classList.add('hidden'));
    state.currentUser = null;
    state.projects = [];
    state.activeProjectId = null;
    state.tasks = [];
  }

  function signOut() {
    state.token = null;
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_active_project');
    renderUnauthenticated();
    showToast('Signed out successfully.', 'info');
  }

  /**
   * Project Management
   */
  async function loadProjects() {
    try {
      const res = await api('/api/projects');
      state.projects = res.data.projects || [];

      renderProjectsMenu();

      if (state.projects.length > 0) {
        // Select saved active project or first available
        const exists = state.projects.find((p) => p._id === state.activeProjectId);
        if (exists) {
          selectProject(exists._id);
        } else {
          selectProject(state.projects[0]._id);
        }
      } else {
        // Auto-create initial onboarding project if user has none
        await createDefaultProject();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function createDefaultProject() {
    try {
      const res = await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Welcome to TaskFlow',
          description: 'Your primary workspace for coordinating development and agile sprints.',
        }),
      });

      const newProj = res.data.project;
      state.projects.push(newProj);
      renderProjectsMenu();
      selectProject(newProj._id);

      // Create a few default tasks to showcase the board
      await api(`/api/projects/${newProj._id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Review Project Architecture',
          description: 'Study the docs/STUDY_GUIDE.md and request flow diagrams.',
          status: 'todo',
          priority: 'high',
        }),
      });

      await api(`/api/projects/${newProj._id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test REST API Endpoints',
          description: 'Import postman/TaskFlow.postman_collection.json and execute requests.',
          status: 'in-progress',
          priority: 'medium',
        }),
      });

      await api(`/api/projects/${newProj._id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Setup Environment & Database',
          description: 'Configure .env and establish Mongoose MongoDB connection.',
          status: 'done',
          priority: 'low',
        }),
      });

      await loadTasks();
    } catch (err) {
      console.error(err);
    }
  }

  function renderProjectsMenu() {
    els.projectListItems.innerHTML = '';
    state.projects.forEach((proj) => {
      const btn = document.createElement('button');
      btn.className = `dropdown-item ${proj._id === state.activeProjectId ? 'active' : ''}`;
      btn.innerHTML = `
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📁 ${escapeHtml(proj.title)}</span>
      `;
      btn.addEventListener('click', () => {
        selectProject(proj._id);
        els.projectMenu.classList.add('hidden');
      });
      els.projectListItems.appendChild(btn);
    });
  }

  async function selectProject(projectId) {
    state.activeProjectId = projectId;
    localStorage.setItem('taskflow_active_project', projectId);

    const proj = state.projects.find((p) => p._id === projectId);
    state.activeProject = proj;

    if (proj) {
      els.currentProjectTitle.textContent = proj.title;
      els.activeProjectTitleDisplay.textContent = proj.title;
      els.activeProjectDescDisplay.textContent = proj.description || 'No description provided.';
    }

    renderProjectsMenu();
    await loadProjectMembers(projectId);
    await loadTasks();
  }

  async function loadProjectMembers(projectId) {
    try {
      const res = await api(`/api/projects/${projectId}`);
      const project = res.data.project;
      state.activeProject = project;

      // Populate members modal roster
      els.projectMembersList.innerHTML = '';
      if (project.members && Array.isArray(project.members)) {
        project.members.forEach((member) => {
          const li = document.createElement('li');
          li.className = 'member-item';
          const isOwner = (project.owner._id || project.owner) === (member._id || member);
          li.innerHTML = `
            <div class="member-item-info">
              <span class="member-name">${escapeHtml(member.name || 'Member')} ${isOwner ? '👑 (Owner)' : ''}</span>
              <span class="member-email">${escapeHtml(member.email || '')}</span>
            </div>
          `;
          els.projectMembersList.appendChild(li);
        });
      }

      // Populate task assignee dropdown
      const assigneeSelect = document.getElementById('taskInputAssignee');
      assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
      if (project.members) {
        project.members.forEach((m) => {
          const opt = document.createElement('option');
          opt.value = m._id || m;
          opt.textContent = `${m.name || 'Member'} (${m.email || ''})`;
          assigneeSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Tasks Management
   */
  async function loadTasks() {
    if (!state.activeProjectId) return;

    try {
      let query = `?sort=${encodeURIComponent(state.filters.sort)}`;
      if (state.filters.priority) {
        query += `&priority=${encodeURIComponent(state.filters.priority)}`;
      }

      const res = await api(`/api/projects/${state.activeProjectId}/tasks${query}`);
      state.tasks = res.data.tasks || [];

      // Filter by client-side search text if present
      let filtered = state.tasks;
      if (state.filters.search.trim()) {
        const queryTerm = state.filters.search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.title.toLowerCase().includes(queryTerm) ||
            (t.description && t.description.toLowerCase().includes(queryTerm))
        );
      }

      renderTasks(filtered);
      updateStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function updateStats() {
    const total = state.tasks.length;
    const todo = state.tasks.filter((t) => t.status === 'todo').length;
    const progress = state.tasks.filter((t) => t.status === 'in-progress').length;
    const done = state.tasks.filter((t) => t.status === 'done').length;

    els.statTotalTasks.textContent = total;
    els.statTodoTasks.textContent = todo;
    els.statProgressTasks.textContent = progress;
    els.statDoneTasks.textContent = done;

    els.countColTodo.textContent = todo;
    els.countColProgress.textContent = progress;
    els.countColDone.textContent = done;
  }

  function renderTasks(tasksToRender) {
    if (state.currentView === 'kanban') {
      renderKanban(tasksToRender);
    } else {
      renderList(tasksToRender);
    }
  }

  function renderKanban(tasks) {
    els.columnTasksTodo.innerHTML = '';
    els.columnTasksProgress.innerHTML = '';
    els.columnTasksDone.innerHTML = '';

    const cols = {
      todo: els.columnTasksTodo,
      'in-progress': els.columnTasksProgress,
      done: els.columnTasksDone,
    };

    tasks.forEach((task) => {
      const container = cols[task.status] || cols.todo;
      const card = createTaskCard(task);
      container.appendChild(card);
    });

    // Check empty columns
    Object.entries(cols).forEach(([status, col]) => {
      if (col.children.length === 0) {
        col.innerHTML = '<div class="empty-col-message">No tasks in this lane</div>';
      }
    });
  }

  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-id', task._id);

    // Format due date
    let dueDateHtml = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const isOverdue = due < new Date() && task.status !== 'done';
      const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dueDateHtml = `
        <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
          📅 ${formatted} ${isOverdue ? '(Overdue)' : ''}
        </span>
      `;
    }

    const assigneeInitials = task.assignedTo?.name
      ? task.assignedTo.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '👤';

    card.innerHTML = `
      <div class="task-card-header">
        <span class="priority-chip chip-${task.priority}">${task.priority}</span>
        <button class="btn-icon-subtle advance-btn" title="Advance Status" onclick="event.stopPropagation(); window.TaskFlowApp.advanceTaskStatus('${task._id}')">➔</button>
      </div>
      <h4 class="task-card-title">${escapeHtml(task.title)}</h4>
      ${task.description ? `<p class="task-card-desc">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-card-footer">
        ${dueDateHtml || '<span>No due date</span>'}
        <div class="task-card-meta-right">
          <div class="task-assignee-avatar" title="${escapeHtml(task.assignedTo?.name || 'Unassigned')}">${assigneeInitials}</div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openTaskDrawer(task));

    return card;
  }

  function renderList(tasks) {
    els.tasksTableBody.innerHTML = '';
    if (tasks.length === 0) {
      els.tasksTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
            No tasks match your criteria.
          </td>
        </tr>
      `;
      return;
    }

    tasks.forEach((task) => {
      const tr = document.createElement('tr');
      const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-';

      tr.innerHTML = `
        <td><span class="table-task-title">${escapeHtml(task.title)}</span></td>
        <td><span class="status-chip chip-${task.status}">${task.status}</span></td>
        <td><span class="priority-chip chip-${task.priority}">${task.priority}</span></td>
        <td>${due}</td>
        <td>${escapeHtml(task.assignedTo?.name || 'Unassigned')}</td>
        <td class="text-right">
          <button class="btn btn-secondary btn-sm" onclick="window.TaskFlowApp.advanceTaskStatus('${task._id}')">Advance</button>
        </td>
      `;

      tr.querySelector('.table-task-title').addEventListener('click', () => openTaskDrawer(task));
      els.tasksTableBody.appendChild(tr);
    });
  }

  /**
   * Task Drawer & Comments
   */
  async function openTaskDrawer(task) {
    state.activeTask = task;
    els.drawerTaskTitle.textContent = task.title;
    els.drawerTaskDesc.textContent = task.description || 'No description provided.';

    els.drawerTaskStatusBadge.textContent = task.status.toUpperCase();
    els.drawerTaskStatusBadge.className = `status-chip chip-${task.status}`;

    els.drawerTaskPriorityBadge.textContent = task.priority.toUpperCase();
    els.drawerTaskPriorityBadge.className = `priority-chip chip-${task.priority}`;

    els.drawerTaskAssignee.textContent = task.assignedTo?.name || 'Unassigned';
    els.drawerTaskDueDate.textContent = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString()
      : 'No due date';
    els.drawerTaskCreatedBy.textContent = task.createdBy?.name || 'Member';
    els.drawerTaskCreatedAt.textContent = task.createdAt
      ? new Date(task.createdAt).toLocaleString()
      : '-';

    els.taskDetailsDrawer.classList.remove('hidden');

    await loadTaskComments(task._id);
  }

  function closeTaskDrawer() {
    els.taskDetailsDrawer.classList.add('hidden');
    state.activeTask = null;
  }

  async function loadTaskComments(taskId) {
    // In our backend, comments are created on /api/tasks/:id/comments
    // We can fetch them via a populated task or simulate thread display
    els.drawerCommentsList.innerHTML = `
      <div class="comment-card">
        <div class="comment-header">
          <span class="comment-author">TaskFlow Bot</span>
          <span class="comment-time">Just now</span>
        </div>
        <p class="comment-body">Task initialized. Use the form below to post updates, PR links, and team comments.</p>
      </div>
    `;
    els.drawerCommentCount.textContent = '1';
  }

  async function advanceTaskStatus(taskId) {
    const task = state.tasks.find((t) => t._id === taskId);
    if (!task) return;

    const flow = {
      todo: 'in-progress',
      'in-progress': 'done',
      done: 'todo',
    };

    const nextStatus = flow[task.status] || 'todo';

    try {
      await api(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      showToast(`Task moved to ${nextStatus}`, 'success');
      await loadTasks();

      if (state.activeTask && state.activeTask._id === taskId) {
        state.activeTask.status = nextStatus;
        els.drawerTaskStatusBadge.textContent = nextStatus.toUpperCase();
        els.drawerTaskStatusBadge.className = `status-chip chip-${nextStatus}`;
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /**
   * Helper Utilities
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Event Listeners Registration
   */
  function initEventListeners() {
    // Topbar Dropdown toggles
    els.projectSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.projectMenu.classList.toggle('hidden');
      els.userProfileMenu.classList.add('hidden');
    });

    els.userAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.userProfileMenu.classList.toggle('hidden');
      els.projectMenu.classList.add('hidden');
    });

    document.addEventListener('click', () => {
      els.projectMenu.classList.add('hidden');
      els.userProfileMenu.classList.add('hidden');
    });

    // Sign out button
    els.btnLogout.addEventListener('click', signOut);

    // Quick demo login button
    els.btnQuickDemoLogin.addEventListener('click', async () => {
      await autoDemoLogin();
    });

    // Auth modal triggers
    const openAuth = (tab) => {
      openModal(els.authModal);
      if (tab === 'login') {
        els.tabBtnLogin.classList.add('active');
        els.tabBtnRegister.classList.remove('active');
        els.loginForm.classList.remove('hidden');
        els.registerForm.classList.add('hidden');
      } else {
        els.tabBtnRegister.classList.add('active');
        els.tabBtnLogin.classList.remove('active');
        els.registerForm.classList.remove('hidden');
        els.loginForm.classList.add('hidden');
      }
    };

    document.getElementById('btnOpenLoginModal')?.addEventListener('click', () => openAuth('login'));
    document.getElementById('btnOpenRegisterModal')?.addEventListener('click', () => openAuth('register'));
    document.getElementById('heroGetStartedBtn')?.addEventListener('click', () => openAuth('register'));
    document.getElementById('heroQuickDemoBtn')?.addEventListener('click', () => autoDemoLogin());

    els.tabBtnLogin.addEventListener('click', () => openAuth('login'));
    els.tabBtnRegister.addEventListener('click', () => openAuth('register'));

    // Fill demo credentials
    document.getElementById('btnFillDemoCredentials')?.addEventListener('click', () => {
      document.getElementById('loginEmail').value = 'dev@taskflow.com';
      document.getElementById('loginPassword').value = 'Password123!';
    });

    // Login Form Submit
    els.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        state.token = res.data.token;
        localStorage.setItem('taskflow_token', res.data.token);
        state.currentUser = res.data.user;

        closeModal(els.authModal);
        showToast('Welcome back to TaskFlow!', 'success');
        renderAuthenticated();
        await loadProjects();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Register Form Submit
    els.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;

      try {
        const res = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });

        state.token = res.data.token;
        localStorage.setItem('taskflow_token', res.data.token);
        state.currentUser = res.data.user;

        closeModal(els.authModal);
        showToast('Account created successfully!', 'success');
        renderAuthenticated();
        await loadProjects();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // New Project Modal trigger
    document.getElementById('btnOpenNewProjectModal').addEventListener('click', () => {
      document.getElementById('projectModalTitle').textContent = 'Create Project Workspace';
      document.getElementById('projectModalId').value = '';
      document.getElementById('projectInputTitle').value = '';
      document.getElementById('projectInputDesc').value = '';
      openModal(els.projectModal);
    });

    // Edit Project trigger
    els.btnEditCurrentProject.addEventListener('click', () => {
      if (!state.activeProject) return;
      document.getElementById('projectModalTitle').textContent = 'Edit Project Details';
      document.getElementById('projectModalId').value = state.activeProject._id;
      document.getElementById('projectInputTitle').value = state.activeProject.title;
      document.getElementById('projectInputDesc').value = state.activeProject.description || '';
      openModal(els.projectModal);
    });

    // Project Form Submit (Create or Update)
    document.getElementById('projectForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const projId = document.getElementById('projectModalId').value;
      const title = document.getElementById('projectInputTitle').value.trim();
      const description = document.getElementById('projectInputDesc').value.trim();

      try {
        if (projId) {
          // Update
          const res = await api(`/api/projects/${projId}`, {
            method: 'PATCH',
            body: JSON.stringify({ title, description }),
          });
          showToast('Project updated successfully.', 'success');
        } else {
          // Create
          const res = await api('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ title, description }),
          });
          state.activeProjectId = res.data.project._id;
          showToast('New project workspace created!', 'success');
        }

        closeModal(els.projectModal);
        await loadProjects();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Delete Project trigger
    els.btnDeleteCurrentProject.addEventListener('click', async () => {
      if (!state.activeProjectId) return;
      if (!confirm('Are you sure you want to delete this project and all its tasks and comments?')) {
        return;
      }

      try {
        await api(`/api/projects/${state.activeProjectId}`, {
          method: 'DELETE',
        });
        showToast('Project deleted.', 'info');
        state.activeProjectId = null;
        localStorage.removeItem('taskflow_active_project');
        await loadProjects();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Task Modal triggers
    document.getElementById('btnOpenNewTaskModal').addEventListener('click', () => {
      window.TaskFlowApp.openNewTaskModal('todo');
    });

    // Task Form Submit
    document.getElementById('taskForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const taskId = document.getElementById('taskModalId').value;
      const title = document.getElementById('taskInputTitle').value.trim();
      const description = document.getElementById('taskInputDesc').value.trim();
      const status = document.getElementById('taskInputStatus').value;
      const priority = document.getElementById('taskInputPriority').value;
      const dueDate = document.getElementById('taskInputDueDate').value || undefined;
      const assignedTo = document.getElementById('taskInputAssignee').value || undefined;

      try {
        if (taskId) {
          await api(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify({ title, description, status, priority, dueDate, assignedTo }),
          });
          showToast('Task updated successfully.', 'success');
        } else {
          await api(`/api/projects/${state.activeProjectId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({ title, description, status, priority, dueDate, assignedTo }),
          });
          showToast('New task added to project.', 'success');
        }

        closeModal(els.taskModal);
        await loadTasks();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Drawer close handlers
    els.btnCloseDrawer.addEventListener('click', closeTaskDrawer);
    els.drawerBackdrop.addEventListener('click', closeTaskDrawer);

    // Drawer Advance Status
    els.btnDrawerAdvanceStatus.addEventListener('click', () => {
      if (state.activeTask) {
        advanceTaskStatus(state.activeTask._id);
      }
    });

    // Drawer Edit Task
    els.btnDrawerEditTask.addEventListener('click', () => {
      if (!state.activeTask) return;
      const t = state.activeTask;
      document.getElementById('taskModalTitle').textContent = 'Edit Task';
      document.getElementById('taskModalId').value = t._id;
      document.getElementById('taskInputTitle').value = t.title;
      document.getElementById('taskInputDesc').value = t.description || '';
      document.getElementById('taskInputStatus').value = t.status;
      document.getElementById('taskInputPriority').value = t.priority;
      document.getElementById('taskInputDueDate').value = t.dueDate ? t.dueDate.split('T')[0] : '';
      document.getElementById('taskInputAssignee').value = t.assignedTo?._id || t.assignedTo || '';
      closeTaskDrawer();
      openModal(els.taskModal);
    });

    // Drawer Delete Task
    els.btnDrawerDeleteTask.addEventListener('click', async () => {
      if (!state.activeTask) return;
      if (!confirm('Delete this task and all its comments?')) return;

      try {
        await api(`/api/tasks/${state.activeTask._id}`, { method: 'DELETE' });
        showToast('Task deleted.', 'info');
        closeTaskDrawer();
        await loadTasks();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Drawer Comment Form Submit
    els.drawerCommentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.activeTask) return;
      const text = els.drawerCommentText.value.trim();
      if (!text) return;

      try {
        const res = await api(`/api/tasks/${state.activeTask._id}/comments`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        });

        els.drawerCommentText.value = '';
        showToast('Comment posted.', 'success');

        // Append to comments list
        const comment = res.data.comment;
        const card = document.createElement('div');
        card.className = 'comment-card';
        card.innerHTML = `
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(comment.author?.name || 'You')}</span>
            <span class="comment-time">Just now</span>
          </div>
          <p class="comment-body">${escapeHtml(comment.text)}</p>
        `;
        els.drawerCommentsList.appendChild(card);
        els.drawerCommentCount.textContent = (
          parseInt(els.drawerCommentCount.textContent || '0', 10) + 1
        ).toString();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Project Members Modal trigger
    els.btnOpenMembersModal.addEventListener('click', () => {
      openModal(els.membersModal);
    });

    // Add Member Form
    els.addMemberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = els.memberEmailInput.value.trim();
      if (!email) return;

      try {
        await api(`/api/projects/${state.activeProjectId}/members`, {
          method: 'POST',
          body: JSON.stringify({ email }),
        });

        els.memberEmailInput.value = '';
        showToast(`Member added to project.`, 'success');
        await loadProjectMembers(state.activeProjectId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // View toggles (Board vs List)
    els.btnViewKanban.addEventListener('click', () => {
      state.currentView = 'kanban';
      els.btnViewKanban.classList.add('active');
      els.btnViewList.classList.remove('active');
      els.kanbanBoardView.classList.remove('hidden');
      els.listViewContainer.classList.add('hidden');
      renderTasks(state.tasks);
    });

    els.btnViewList.addEventListener('click', () => {
      state.currentView = 'list';
      els.btnViewList.classList.add('active');
      els.btnViewKanban.classList.remove('active');
      els.kanbanBoardView.classList.add('hidden');
      els.listViewContainer.classList.remove('hidden');
      renderTasks(state.tasks);
    });

    // Filters and Search
    els.filterPrioritySelect.addEventListener('change', (e) => {
      state.filters.priority = e.target.value;
      loadTasks();
    });

    els.sortTasksSelect.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      loadTasks();
    });

    let searchTimer;
    els.globalSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.filters.search = e.target.value;
        loadTasks();
      }, 250);
    });

    els.btnRefreshWorkspace.addEventListener('click', () => {
      loadTasks();
      showToast('Workspace refreshed', 'info');
    });
  }

  /**
   * One-Click Auto Demo Login Helper
   */
  async function autoDemoLogin() {
    try {
      // First try to login demo user
      const demoEmail = 'demo@taskflow.dev';
      const demoPass = 'Password123!';

      let res;
      try {
        res = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: demoEmail, password: demoPass }),
        });
      } catch (e) {
        // If demo user does not exist yet, register them
        res = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Demo Architect',
            email: demoEmail,
            password: demoPass,
          }),
        });
      }

      state.token = res.data.token;
      localStorage.setItem('taskflow_token', res.data.token);
      state.currentUser = res.data.user;

      closeModal(els.authModal);
      showToast('Signed in as Demo Architect!', 'success');
      renderAuthenticated();
      await loadProjects();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Public API exported to window for inline onclick hooks
  window.TaskFlowApp = {
    openNewTaskModal: (status = 'todo') => {
      document.getElementById('taskModalTitle').textContent = 'Create New Task';
      document.getElementById('taskModalId').value = '';
      document.getElementById('taskInputTitle').value = '';
      document.getElementById('taskInputDesc').value = '';
      document.getElementById('taskInputStatus').value = status;
      document.getElementById('taskInputPriority').value = 'medium';
      document.getElementById('taskInputDueDate').value = '';
      document.getElementById('taskInputAssignee').value = '';
      openModal(els.taskModal);
    },
    advanceTaskStatus,
  };

  // Bootstrap application
  initEventListeners();
  checkAuth();
})();
