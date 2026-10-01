import { Contact, TaskItem } from "../types";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  updated?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

/* =========================================================
   1. GOOGLE CONTACTS (People API)
========================================================= */

export async function fetchGoogleContacts(accessToken: string): Promise<Contact[]> {
  const url =
    "https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,organizations&pageSize=100";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al consultar Google Contacts (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const connections = data.connections || [];

  return connections.map((person: any, idx: number): Contact => {
    const name = person.names?.[0]?.displayName || "Sin nombre";
    const phone = person.phoneNumbers?.[0]?.value || "";
    const email = person.emailAddresses?.[0]?.value || "";
    const org = person.organizations?.[0]?.name || "";
    const title = person.organizations?.[0]?.title || "";

    return {
      id: `google-${person.resourceName?.replace("people/", "") || idx}`,
      nombre: name,
      telefono: phone.replace(/[^0-9+]/g, ""),
      email,
      empresa: org,
      rol: title || "Contacto Google",
      dominio: "Google Contacts",
    };
  });
}

export async function createGoogleContact(
  accessToken: string,
  contact: { nombre: string; telefono: string; email?: string; dominio?: string; rol?: string }
): Promise<any> {
  const url = "https://people.googleapis.com/v1/people:createContact";
  const payload: any = {
    names: [{ givenName: contact.nombre }],
  };

  if (contact.telefono) {
    payload.phoneNumbers = [{ value: contact.telefono, type: "mobile" }];
  }
  if (contact.email) {
    payload.emailAddresses = [{ value: contact.email, type: "work" }];
  }
  if (contact.dominio || contact.rol) {
    payload.organizations = [
      {
        name: contact.dominio || "Task-OS",
        title: contact.rol || "Contacto",
      },
    ];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al crear contacto en Google (${res.status}): ${errText}`);
  }

  return await res.json();
}

/* =========================================================
   2. GOOGLE CALENDAR
========================================================= */

export async function fetchCalendarEvents(
  accessToken: string,
  daysSpan: number = 30
): Promise<GoogleCalendarEvent[]> {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7); // past 7 days up to next 30 days
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + daysSpan);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al obtener eventos de Google Calendar (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    date: string; // YYYY-MM-DD
    startTime?: string; // HH:mm or full ISO
    durationMinutes?: number;
  }
): Promise<GoogleCalendarEvent> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  let body: any;
  if (event.startTime) {
    const startIso = `${event.date}T${event.startTime}:00`;
    const startDate = new Date(startIso);
    const duration = event.durationMinutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    body = {
      summary: event.summary,
      description: event.description || "Evento programado desde Task-OS",
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
    };
  } else {
    // All day event
    body = {
      summary: event.summary,
      description: event.description || "Tarea programada desde Task-OS",
      start: { date: event.date },
      end: { date: event.date },
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al crear evento en Google Calendar (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    summary: string;
    description?: string;
    date: string; // YYYY-MM-DD
    startTime?: string; // HH:mm or full ISO
    durationMinutes?: number;
  }
): Promise<GoogleCalendarEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  let body: any;
  if (event.startTime) {
    const startIso = `${event.date}T${event.startTime}:00`;
    const startDate = new Date(startIso);
    const duration = event.durationMinutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    body = {
      summary: event.summary,
      description: event.description || "Evento sincronizado desde Task-OS",
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
    };
  } else {
    body = {
      summary: event.summary,
      description: event.description || "Tarea sincronizada desde Task-OS",
      start: { date: event.date },
      end: { date: event.date },
    };
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al actualizar evento en Google Calendar (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Error al eliminar evento en Google Calendar (${res.status}): ${err}`);
  }
}

/* =========================================================
   3. GOOGLE TASKS
========================================================= */

export async function fetchGoogleTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const url = "https://tasks.googleapis.com/tasks/v1/users/@me/lists";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al obtener listas de Google Tasks (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function fetchGoogleTasks(
  accessToken: string,
  taskListId: string = "@default"
): Promise<GoogleTaskItem[]> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?maxResults=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al obtener tareas de Google Tasks (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createGoogleTask(
  accessToken: string,
  task: {
    title: string;
    notes?: string;
    dueDate?: string; // YYYY-MM-DD
    taskListId?: string;
  }
): Promise<GoogleTaskItem> {
  const listId = task.taskListId || "@default";
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`;

  const body: any = {
    title: task.title,
    notes: task.notes || "",
  };

  if (task.dueDate) {
    body.due = `${task.dueDate}T00:00:00.000Z`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al crear tarea en Google Tasks (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function updateGoogleTask(
  accessToken: string,
  taskId: string,
  task: {
    title?: string;
    notes?: string;
    dueDate?: string; // YYYY-MM-DD
    status?: "needsAction" | "completed";
    taskListId?: string;
  }
): Promise<GoogleTaskItem> {
  const listId = task.taskListId || "@default";
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`;

  const body: any = { id: taskId };
  if (task.title !== undefined) body.title = task.title;
  if (task.notes !== undefined) body.notes = task.notes;
  if (task.status !== undefined) body.status = task.status;
  if (task.dueDate !== undefined) {
    body.due = task.dueDate ? `${task.dueDate}T00:00:00.000Z` : null;
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al actualizar tarea en Google Tasks (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function patchGoogleTaskStatus(
  accessToken: string,
  taskId: string,
  status: "needsAction" | "completed",
  taskListId: string = "@default"
): Promise<GoogleTaskItem> {
  return updateGoogleTask(accessToken, taskId, { status, taskListId });
}

export async function deleteGoogleTask(
  accessToken: string,
  taskId: string,
  taskListId: string = "@default"
): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Error al eliminar tarea en Google Tasks (${res.status}): ${err}`);
  }
}

/* =========================================================
   4. GOOGLE SHEETS
========================================================= */

export async function exportLedgerToGoogleSheet(
  accessToken: string,
  tasks: TaskItem[],
  customTitle?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const dateStr = new Date().toISOString().split("T")[0];
  const title = customTitle || `Task-OS Ledger Maestro - ${dateStr}`;

  // 1. Create Spreadsheet
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const headersRow = [
    "ID",
    "Solicitante",
    "Tarea",
    "Estado",
    "Fecha Ingreso",
    "Fecha Límite",
    "Dominio",
    "Teléfono",
    "Etiquetas",
    "Notas",
  ];

  const rows = tasks.map((t) => [
    t.id,
    t.solicitante || "Pepe",
    t.tarea || "",
    t.estado || "Pendiente",
    t.fechaIngreso || "",
    t.fechaLimite || "Sin fecha",
    t.dominio || "General",
    t.contacto?.telefono || "",
    (t.etiquetas || []).join(", "),
    t.notas || "",
  ]);

  const spreadsheetBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: "Ledger Maestro",
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headersRow.map((h) => ({
                  userEnteredValue: { stringValue: h },
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.94, green: 0.94, blue: 0.94 },
                  },
                })),
              },
              ...rows.map((row) => ({
                values: row.map((cell) => ({
                  userEnteredValue:
                    typeof cell === "number"
                      ? { numberValue: cell }
                      : { stringValue: String(cell) },
                })),
              })),
            ],
          },
        ],
      },
    ],
  };

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(spreadsheetBody),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Error al crear la hoja en Google Sheets (${createRes.status}): ${err}`);
  }

  const result = await createRes.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl =
    result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
  };
}

/* =========================================================
   5. GOOGLE KEEP (Notas & Listas de verificación)
========================================================= */

export function formatTaskForGoogleKeep(task: TaskItem): string {
  let noteText = `[Task-OS #${task.id}] ${task.tarea}\n`;
  noteText += `Estado: ${task.estado}\n`;
  noteText += `Solicitante: ${task.solicitante}\n`;
  if (task.fechaLimite) noteText += `Fecha Límite: ${task.fechaLimite}\n`;
  if (task.dominio) noteText += `Dominio: ${task.dominio}\n`;
  if (task.contacto?.telefono) noteText += `WhatsApp: https://wa.me/${task.contacto.telefono}\n`;
  if (task.notas) {
    noteText += `\nNotas:\n${task.notas}\n`;
  }
  return noteText;
}

export function formatAllTasksForGoogleKeep(tasks: TaskItem[]): string {
  const activeTasks = tasks.filter((t) => t.estado !== "Completado");
  let noteText = `📌 TASK-OS — PENDIENTES ACTIVOS (${new Date().toLocaleDateString("es-ES")})\n\n`;

  activeTasks.forEach((t) => {
    noteText += `☐ [#${t.id}] ${t.tarea} (${t.solicitante})${t.fechaLimite ? ` 📅 ${t.fechaLimite}` : ""}\n`;
    if (t.notas) {
      noteText += `   ↳ ${t.notas}\n`;
    }
  });

  return noteText;
}
