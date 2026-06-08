(function () {
  'use strict';

  const STORAGE_KEY = 'lcars_tasks_v1';
  let tasks = [];
  let activeFilter = 'all';

  const taskInput = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const statPending = document.getElementById('stat-pending');
  const statDone = document.getElementById('stat-done');
  const statTotal = document.getElementById('stat-total');
  const sectionLabel = document.getElementById('section-label');

  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      tasks = stored ? JSON.parse(stored) : [];
    } catch (e) {
      tasks = [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      showToast('STORAGE WRITE FAILED', 'toast-delete');
    }
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  updateStats();

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const pending = total - done;

    statTotal.textContent = total;
    statPending.textContent = pending;
    statDone.textContent = done;
  }

  function getFilteredTasks() {
    if (activeFilter === 'active') return tasks.filter(t => !t.completed);
    if (activeFilter === 'done') return tasks.filter(t => t.completed);
    return tasks;
  }

  function formatTimestamp(isoStr) {
    const d = new Date(isoStr);
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${DD}/${mo} ${HH}:${MM}`;
  }

  function createTaskElement(task) {
    const item = document.createElement('div');
    item.className = `task-item${task.completed ? ' completed' : ''}`;
    item.setAttribute('role', 'listitem');
    item.setAttribute('data-id', task.id);

    item.innerHTML = `
      <button class="task-check" onclick="toggleTask('${task.id}')" aria-label="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
        <div class="check-ring">
          <div class="check-icon"></div>
        </div>
      </button>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <span class="task-timestamp">${formatTimestamp(task.createdAt)}</span>
      <button class="task-delete" onclick="deleteTask('${task.id}')" aria-label="Delete task" title="Delete">
        <span class="delete-x">&#10005;</span>
      </button>
    `;

    return item;
  }

  function render() {
    const filtered = getFilteredTasks();

    const labels = { all: 'ALL TASKS', active: 'ACTIVE TASKS', done: 'COMPLETED TASKS' };
    sectionLabel.textContent = labels[activeFilter];

    taskList.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.classList.add('visible');
    } else {
      emptyState.classList.remove('visible');
      filtered.forEach(task => {
        taskList.appendChild(createTaskElement(task));
      });
    }

    updateStats();
    highlightFilterBtn();
  }

  function highlightFilterBtn() {
    ['filter-all', 'filter-active', 'filter-done'].forEach(id => {
      document.getElementById(id).classList.remove('filter-active-state');
    });
    const idMap = { all: 'filter-all', active: 'filter-active', done: 'filter-done' };
    document.getElementById(idMap[activeFilter]).classList.add('filter-active-state');
  }

  window.addTask = function () {
    const raw = taskInput.value.trim();
    if (!raw) {
      showToast('TASK CANNOT BE EMPTY', 'toast-warn');
      taskInput.focus();
      return;
    }

    const task = {
      id: genId(),
      text: raw,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    tasks.unshift(task);
    saveTasks();
    taskInput.value = '';
    taskInput.focus();
    render();
    showToast('TASK ADDED', 'toast-success');
  };

  window.toggleTask = function (id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();

    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      if (task.completed) {
        el.classList.add('completed');
        showToast('TASK COMPLETED', 'toast-success');
      } else {
        el.classList.remove('completed');
        showToast('TASK REACTIVATED', 'toast-success');
      }
    }

    render();
  };

  window.deleteTask = function (id) {
    const el = document.querySelector(`[data-id="${id}"]`);

    function doDelete() {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
      showToast('TASK DELETED', 'toast-delete');
    }

    if (el) {
      el.classList.add('removing');
      el.addEventListener('animationend', doDelete, { once: true });
      setTimeout(doDelete, 300);
    } else {
      doDelete();
    }
  };

  window.setFilter = function (filter) {
    activeFilter = filter;
    render();
  };

  window.clearCompleted = function () {
    const count = tasks.filter(t => t.completed).length;
    if (count === 0) {
      showToast('NO COMPLETED TASKS TO CLEAR', 'toast-warn');
      return;
    }
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    render();
    showToast(`${count} TASK${count !== 1 ? 'S' : ''} DELETED`, 'toast-delete');
  };

  window.clearAll = function () {
    if (tasks.length === 0) {
      showToast('TASK LOG IS ALREADY EMPTY', 'toast-warn');
      return;
    }
    const count = tasks.length;
    tasks = [];
    saveTasks();
    render();
    showToast(`ALL ${count} TASK${count !== 1 ? 'S' : ''} CLEARED`, 'toast-delete');
  };

  function showToast(msg, type = 'toast-success') {
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  taskInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') window.addTask();
  });

  (function initMobileSidebar() {
    const sidebar = document.getElementById('left-sidebar');
    const topLogo = document.querySelector('.top-bar-logo');
    const statusLogo = document.querySelector('.status-bar-logo');
    if (!sidebar || !topLogo || !statusLogo) return;

    const slideElements = [sidebar, topLogo, statusLogo];

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isTracking = false;
    let sidebarOpen = false;
    let sidebarWidth = sidebar.offsetWidth || 80;

    function setTranslation(translatePx, progress) {
      slideElements.forEach(el => {
        el.style.marginLeft = `${translatePx}px`;
      });
    }

    function openSidebar() {
      document.body.classList.add('sidebar-open');
      slideElements.forEach(el => {
        el.classList.add('open');
        el.style.marginLeft = '';
      });
      sidebarOpen = true;
    }

    function closeSidebar() {
      document.body.classList.remove('sidebar-open');
      slideElements.forEach(el => {
        el.classList.remove('open');
        el.style.marginLeft = '';
      });
      sidebarOpen = false;
    }

    sidebar.querySelectorAll('.sidebar-block').forEach(btn => {
      btn.addEventListener('click', function () {
        if (window.innerWidth <= 480) {
          closeSidebar();
        }
      });
    });

    document.addEventListener('touchstart', function (e) {
      if (window.innerWidth > 480) return;

      sidebarWidth = sidebar.offsetWidth || 80;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;

      if (sidebarOpen) {
        isSwiping = true;
        isTracking = false;
        slideElements.forEach(el => {
          el.style.transition = 'none';
        });
      } else {
        isTracking = true;
        isSwiping = false;
      }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      const touch = e.touches[0];
      currentX = touch.clientX;
      const deltaX = currentX - startX;
      const deltaY = touch.clientY - startY;

      if (isTracking && !isSwiping) {
        const threshold = 10;
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
          if (deltaX > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            isSwiping = true;
            isTracking = false;
            document.body.classList.add('sidebar-open');
            slideElements.forEach(el => {
              el.style.transition = 'none';
            });
          } else {
            isTracking = false;
          }
        }
      }

      if (!isSwiping) return;

      if (e.cancelable) e.preventDefault();

      if (!sidebarOpen) {
        if (deltaX >= 0) {
          const translate = Math.min(deltaX - sidebarWidth, 0);
          setTranslation(translate, Math.min(deltaX / sidebarWidth, 1));
        }
      } else {
        if (deltaX <= 0) {
          const translate = Math.max(deltaX, -sidebarWidth);
          setTranslation(translate, Math.max(1 + (deltaX / sidebarWidth), 0));
        }
      }
    }, { passive: false });

    document.addEventListener('touchend', function (e) {
      isTracking = false;
      if (!isSwiping) return;
      isSwiping = false;

      slideElements.forEach(el => {
        el.style.transition = '';
      });

      const deltaX = currentX - startX;

      if (!sidebarOpen) {
        if (deltaX > sidebarWidth / 3) {
          openSidebar();
        } else {
          closeSidebar();
        }
      } else {
        if (deltaX < -sidebarWidth / 3) {
          closeSidebar();
        } else {
          openSidebar();
        }
      }
    }, { passive: true });
  })();

  loadTasks();
  render();

})();
