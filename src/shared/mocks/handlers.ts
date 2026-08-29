// Interception des appels réseau pendant les tests.
// Un handler par source : les tests n'atteignent jamais les vraies API,
// ce qui les rend rapides, déterministes et indépendants d'Internet.

import { http, HttpResponse } from 'msw';
import {
  mockCarts,
  mockCategories,
  mockClientProfiles,
  mockComments,
  mockJsonPlaceholderPosts,
  mockJsonPlaceholderTodos,
  mockLeaveRequests,
  mockOpportunities,
  mockOrderMeta,
  mockPipelineStages,
  mockPmsComments,
  mockPresenceEntries,
  mockProducts,
  mockProjectOverrides,
  mockRandomUserResults,
  mockReqresUsers,
  mockStockMovements,
  mockSuppliers,
  mockTaskOverrides,
  mockUsers,
} from './fixtures';

const DUMMY = 'https://dummyjson.com';
const PLACEHOLDER = 'https://jsonplaceholder.typicode.com';
const LOCAL = 'http://localhost:3001';
const WEATHER = 'https://api.openweathermap.org/data/2.5';
const REQRES = 'https://reqres.in/api';
const RANDOM_USER = 'https://randomuser.me/api';

// Reproduit la pagination de DummyJSON : limit=0 renvoie tout.
function paginate<T>(items: T[], url: URL, key: string) {
  const limit = Number(url.searchParams.get('limit') ?? 10);
  const skip = Number(url.searchParams.get('skip') ?? 0);
  const page = limit === 0 ? items : items.slice(skip, skip + limit);

  return HttpResponse.json({
    [key]: page,
    total: items.length,
    skip,
    limit: limit === 0 ? items.length : limit,
  });
}

/* ---------- DummyJSON ---------- */

const dummyJsonHandlers = [
  http.get(`${DUMMY}/users/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').toLowerCase();

    const found = mockUsers.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(query),
    );

    return paginate(found, url, 'users');
  }),

  http.get(`${DUMMY}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === Number(params.id));
    return user ? HttpResponse.json(user) : new HttpResponse(null, { status: 404 });
  }),

  http.get(`${DUMMY}/users`, ({ request }) =>
    paginate(mockUsers, new URL(request.url), 'users'),
  ),

  http.get(`${DUMMY}/carts/user/:id`, ({ params, request }) => {
    const carts = mockCarts.filter((cart) => cart.userId === Number(params.id));
    return paginate(carts, new URL(request.url), 'carts');
  }),

  http.get(`${DUMMY}/carts/:id`, ({ params }) => {
    const cart = mockCarts.find((c) => c.id === Number(params.id));
    return cart ? HttpResponse.json(cart) : new HttpResponse(null, { status: 404 });
  }),

  http.get(`${DUMMY}/carts`, ({ request }) =>
    paginate(mockCarts, new URL(request.url), 'carts'),
  ),

  http.get(`${DUMMY}/products/category-list`, () => HttpResponse.json(mockCategories)),

  http.get(`${DUMMY}/products/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').toLowerCase();

    const found = mockProducts.filter((product) =>
      product.title.toLowerCase().includes(query),
    );

    return paginate(found, url, 'products');
  }),

  http.get(`${DUMMY}/products/category/:category`, ({ params, request }) => {
    const found = mockProducts.filter((product) => product.category === params.category);
    return paginate(found, new URL(request.url), 'products');
  }),

  http.get(`${DUMMY}/products/:id`, ({ params }) => {
    const product = mockProducts.find((p) => p.id === Number(params.id));
    return product ? HttpResponse.json(product) : new HttpResponse(null, { status: 404 });
  }),

  http.get(`${DUMMY}/products`, ({ request }) =>
    paginate(mockProducts, new URL(request.url), 'products'),
  ),
];

/* ---------- JSONPlaceholder ---------- */

const placeholderHandlers = [
  http.get(`${PLACEHOLDER}/posts`, () => HttpResponse.json(mockJsonPlaceholderPosts)),
  http.get(`${PLACEHOLDER}/todos`, () => HttpResponse.json(mockJsonPlaceholderTodos)),

  http.get(`${PLACEHOLDER}/comments`, ({ request }) => {
    const postId = new URL(request.url).searchParams.get('postId');

    const found = postId
      ? mockComments.filter((comment) => comment.postId === Number(postId))
      : mockComments;

    return HttpResponse.json(found);
  }),
];

/* ---------- JSON Server ---------- */

// Filtre générique sur un paramètre de requête, comme le fait JSON Server.
function filterByQuery<T extends Record<string, unknown>>(
  items: T[],
  url: URL,
  field: keyof T & string,
) {
  const value = url.searchParams.get(field);
  if (!value) return items;

  return items.filter((item) => String(item[field]) === value);
}

const jsonServerHandlers = [
  http.get(`${LOCAL}/pipelineStages`, () => HttpResponse.json(mockPipelineStages)),

  http.get(`${LOCAL}/opportunities`, ({ request }) =>
    HttpResponse.json(
      filterByQuery(
        mockOpportunities as unknown as Array<Record<string, unknown>>,
        new URL(request.url),
        'stageId',
      ),
    ),
  ),

  http.get(`${LOCAL}/opportunities/:id`, ({ params }) => {
    const found = mockOpportunities.find((o) => o.id === Number(params.id));
    return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
  }),

  http.post(`${LOCAL}/opportunities`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...body, id: 999 }, { status: 201 });
  }),

  http.patch(`${LOCAL}/opportunities/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const index = mockOpportunities.findIndex((o) => o.id === Number(params.id));

    if (index === -1) return new HttpResponse(null, { status: 404 });

    mockOpportunities[index] = { ...mockOpportunities[index], ...body };
    return HttpResponse.json(mockOpportunities[index]);
  }),

  http.delete(`${LOCAL}/opportunities/:id`, () => new HttpResponse(null, { status: 200 })),

  http.get(`${LOCAL}/clientProfiles`, ({ request }) =>
    HttpResponse.json(
      filterByQuery(
        mockClientProfiles as unknown as Array<Record<string, unknown>>,
        new URL(request.url),
        'clientId',
      ),
    ),
  ),

  http.post(`${LOCAL}/clientProfiles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...body, id: 99 }, { status: 201 });
  }),

  http.patch(`${LOCAL}/clientProfiles/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...body, id: Number(params.id) });
  }),

  http.get(`${LOCAL}/orders`, ({ request }) =>
    HttpResponse.json(
      filterByQuery(
        mockOrderMeta as unknown as Array<Record<string, unknown>>,
        new URL(request.url),
        'orderId',
      ),
    ),
  ),

  http.post(`${LOCAL}/orders`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...body, id: 99 }, { status: 201 });
  }),

  http.patch(`${LOCAL}/orders/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...body, id: Number(params.id) });
  }),

  http.get(`${LOCAL}/suppliers/:id`, ({ params }) => {
    const found = mockSuppliers.find((s) => s.id === Number(params.id));
    return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
  }),

  http.get(`${LOCAL}/suppliers`, () => HttpResponse.json(mockSuppliers)),

  http.patch(`${LOCAL}/suppliers/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const index = mockSuppliers.findIndex((s) => s.id === Number(params.id));

    if (index === -1) return new HttpResponse(null, { status: 404 });

    mockSuppliers[index] = { ...mockSuppliers[index], ...body };
    return HttpResponse.json(mockSuppliers[index]);
  }),

  http.get(`${LOCAL}/stockMovements`, ({ request }) =>
    HttpResponse.json(
      filterByQuery(
        mockStockMovements as unknown as Array<Record<string, unknown>>,
        new URL(request.url),
        'productId',
      ),
    ),
  ),

  http.post(`${LOCAL}/stockMovements`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...body, id: 999 }, { status: 201 });
  }),

  http.get(`${LOCAL}/auditLog`, () => HttpResponse.json([])),
  http.post(`${LOCAL}/auditLog`, () => HttpResponse.json({ id: 1 }, { status: 201 })),
];

/* ---------- OpenWeatherMap ---------- */

const weatherHandlers = [
  http.get(`${WEATHER}/weather`, () =>
    HttpResponse.json({
      weather: [{ id: 804, main: 'Clouds', description: 'couvert', icon: '04d' }],
      main: { temp: 22.1, feels_like: 21.8, temp_min: 20, temp_max: 23, humidity: 55, pressure: 1010 },
      wind: { speed: 5, deg: 250 },
      clouds: { all: 100 },
      visibility: 10000,
      dt: 1787252155,
      sys: { country: 'FR', sunrise: 1787201417, sunset: 1787252241 },
      timezone: 7200,
      name: 'Évry',
    }),
  ),

  http.get(`${WEATHER}/forecast`, () =>
    HttpResponse.json({
      list: [
        {
          dt: 1787313600,
          dt_txt: '2026-08-21 12:00:00',
          weather: [{ id: 804, main: 'Clouds', description: 'couvert', icon: '04d' }],
          main: { temp: 21, feels_like: 20, temp_min: 21, temp_max: 22, humidity: 52, pressure: 1011 },
          wind: { speed: 4, deg: 268 },
        },
        {
          dt: 1787324400,
          dt_txt: '2026-08-21 15:00:00',
          weather: [{ id: 500, main: 'Rain', description: 'légère pluie', icon: '10d' }],
          main: { temp: 24, feels_like: 23, temp_min: 24, temp_max: 25, humidity: 36, pressure: 1010 },
          wind: { speed: 5, deg: 284 },
        },
      ],
      city: { name: 'Évry', country: 'FR', timezone: 7200 },
    }),
  ),
];

/* ---------- Reqres : comptes (6 par page, comme la vraie API) ---------- */

const REQRES_PER_PAGE = 6;

const reqresHandlers = [
  http.get(`${REQRES}/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const start = (page - 1) * REQRES_PER_PAGE;

    return HttpResponse.json({
      page,
      per_page: REQRES_PER_PAGE,
      total: mockReqresUsers.length,
      total_pages: Math.ceil(mockReqresUsers.length / REQRES_PER_PAGE),
      data: mockReqresUsers.slice(start, start + REQRES_PER_PAGE),
    });
  }),

  http.get(`${REQRES}/users/:id`, ({ params }) => {
    const user = mockReqresUsers.find((u) => u.id === Number(params.id));
    return user ? HttpResponse.json({ data: user }) : new HttpResponse(null, { status: 404 });
  }),

  http.post(`${REQRES}/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'eve.holt@reqres.in' && body.password === 'pistol') {
      return HttpResponse.json({ token: 'QpwL5tke4Pnpja7X4' });
    }
    return new HttpResponse(JSON.stringify({ error: 'user not found' }), { status: 400 });
  }),

  http.post(`${REQRES}/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'eve.holt@reqres.in') {
      return HttpResponse.json({ id: 4, token: 'QpwL5tke4Pnpja7X4' });
    }
    return new HttpResponse(
      JSON.stringify({ error: 'Note: Only defined users succeed registration' }),
      { status: 400 },
    );
  }),

  http.put(`${REQRES}/users/:id`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...body, updatedAt: new Date().toISOString() });
  }),

  http.delete(`${REQRES}/users/:id`, () => new HttpResponse(null, { status: 204 })),
];

/* ---------- RandomUser : profils d'enrichissement RH ---------- */

const randomUserHandlers = [
  http.get(`${RANDOM_USER}/`, ({ request }) => {
    const url = new URL(request.url);
    const results = Number(url.searchParams.get('results') ?? 1);
    return HttpResponse.json({ results: mockRandomUserResults.slice(0, results) });
  }),
];

/* ---------- RH et PMS : collections locales (JSON Server) ---------- */

const myJsonServerHandlers = [
  http.get(`${LOCAL}/leaveRequests`, ({ request }) => {
    const url = new URL(request.url);
    let items = mockLeaveRequests as unknown as Array<Record<string, unknown>>;
    items = filterByQuery(items, url, 'employeeId');
    items = filterByQuery(items, url, 'status');
    return HttpResponse.json(items);
  }),

  http.post(`${LOCAL}/leaveRequests`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const created = { ...body, id: mockLeaveRequests.length + 1000 };
    mockLeaveRequests.push(created as never);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${LOCAL}/leaveRequests/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const index = mockLeaveRequests.findIndex((r) => r.id === Number(params.id));
    if (index === -1) return new HttpResponse(null, { status: 404 });

    mockLeaveRequests[index] = { ...mockLeaveRequests[index], ...body };
    return HttpResponse.json(mockLeaveRequests[index]);
  }),

  http.get(`${LOCAL}/presence`, ({ request }) => {
    const url = new URL(request.url);
    let items = mockPresenceEntries as unknown as Array<Record<string, unknown>>;
    items = filterByQuery(items, url, 'employeeId');
    items = filterByQuery(items, url, 'date');
    return HttpResponse.json(items);
  }),

  http.post(`${LOCAL}/presence`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const created = { ...body, id: mockPresenceEntries.length + 1000 };
    mockPresenceEntries.push(created as never);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${LOCAL}/presence/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const index = mockPresenceEntries.findIndex((p) => p.id === Number(params.id));
    if (index === -1) return new HttpResponse(null, { status: 404 });

    mockPresenceEntries[index] = { ...mockPresenceEntries[index], ...body };
    return HttpResponse.json(mockPresenceEntries[index]);
  }),

  http.get(`${LOCAL}/projects`, () => HttpResponse.json(mockProjectOverrides)),

  http.post(`${LOCAL}/projects`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    mockProjectOverrides.push(body as never);
    return HttpResponse.json(body, { status: 201 });
  }),

  http.patch(`${LOCAL}/projects/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const index = mockProjectOverrides.findIndex((p) => p.id === Number(params.id));
    if (index === -1) return new HttpResponse(null, { status: 404 });

    mockProjectOverrides[index] = { ...mockProjectOverrides[index], ...body };
    return HttpResponse.json(mockProjectOverrides[index]);
  }),

  http.delete(`${LOCAL}/projects/:id`, ({ params }) => {
    const index = mockProjectOverrides.findIndex((p) => p.id === Number(params.id));
    if (index !== -1) mockProjectOverrides.splice(index, 1);
    return new HttpResponse(null, { status: 200 });
  }),

  http.get(`${LOCAL}/tasks`, () => HttpResponse.json(mockTaskOverrides)),

  http.post(`${LOCAL}/tasks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    mockTaskOverrides.push(body as never);
    return HttpResponse.json(body, { status: 201 });
  }),

  http.patch(`${LOCAL}/tasks/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const index = mockTaskOverrides.findIndex((t) => t.id === Number(params.id));
    if (index === -1) return new HttpResponse(null, { status: 404 });

    mockTaskOverrides[index] = { ...mockTaskOverrides[index], ...body };
    return HttpResponse.json(mockTaskOverrides[index]);
  }),

  http.delete(`${LOCAL}/tasks/:id`, ({ params }) => {
    const index = mockTaskOverrides.findIndex((t) => t.id === Number(params.id));
    if (index !== -1) mockTaskOverrides.splice(index, 1);
    return new HttpResponse(null, { status: 200 });
  }),

  http.get(`${LOCAL}/comments`, ({ request }) => {
    const url = new URL(request.url);
    let items = mockPmsComments as unknown as Array<Record<string, unknown>>;
    items = filterByQuery(items, url, 'projectId');
    items = filterByQuery(items, url, 'taskId');
    return HttpResponse.json(items);
  }),

  http.post(`${LOCAL}/comments`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const created = { ...body, id: mockPmsComments.length + 1000 };
    mockPmsComments.push(created as never);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${LOCAL}/comments/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const index = mockPmsComments.findIndex((c) => c.id === Number(params.id));
    if (index === -1) return new HttpResponse(null, { status: 404 });

    mockPmsComments[index] = { ...mockPmsComments[index], ...body };
    return HttpResponse.json(mockPmsComments[index]);
  }),

  http.delete(`${LOCAL}/comments/:id`, ({ params }) => {
    const index = mockPmsComments.findIndex((c) => c.id === Number(params.id));
    if (index !== -1) mockPmsComments.splice(index, 1);
    return new HttpResponse(null, { status: 200 });
  }),
];

export const handlers = [
  ...dummyJsonHandlers,
  ...placeholderHandlers,
  ...jsonServerHandlers,
  ...weatherHandlers,
  ...reqresHandlers,
  ...randomUserHandlers,
  ...myJsonServerHandlers,
];