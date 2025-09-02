--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-09-02 15:09:21 +03

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4123 (class 0 OID 22624)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, first_name, last_name, email, password, created, created_by, role, confirmed_email, confirmed_email_token, reset_password_token, reset_password_expiry) FROM stdin;
\.


--
-- TOC entry 4130 (class 0 OID 22770)
-- Dependencies: 226
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (log_id, user_id, action, log_time) FROM stdin;
\.


--
-- TOC entry 4125 (class 0 OID 22705)
-- Dependencies: 221
-- Data for Name: desks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.desks (desk_id, desk_code, isactive, created, created_by) FROM stdin;
\.


--
-- TOC entry 4127 (class 0 OID 22724)
-- Dependencies: 223
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (booking_id, user_id, desk_id, booking_start, booking_end, status, created) FROM stdin;
\.


--
-- TOC entry 4128 (class 0 OID 22743)
-- Dependencies: 224
-- Data for Name: facilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.facilities (facility_id, name, description) FROM stdin;
\.


--
-- TOC entry 4129 (class 0 OID 22752)
-- Dependencies: 225
-- Data for Name: desk_facilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.desk_facilities (desk_id, facility_id) FROM stdin;
\.


--
-- TOC entry 4135 (class 0 OID 23220)
-- Dependencies: 231
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token, expires, created, is_revoked) FROM stdin;
\.


--
-- TOC entry 4124 (class 0 OID 22694)
-- Dependencies: 220
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workspaces (workspace_name, floor_number, created) FROM stdin;
\.


--
-- TOC entry 4141 (class 0 OID 0)
-- Dependencies: 228
-- Name: audit_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_log_id_seq', 1, false);


--
-- TOC entry 4142 (class 0 OID 0)
-- Dependencies: 222
-- Name: bookings_booking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_booking_id_seq', 1, false);


--
-- TOC entry 4143 (class 0 OID 0)
-- Dependencies: 229
-- Name: desks_desk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.desks_desk_id_seq', 1, false);


--
-- TOC entry 4144 (class 0 OID 0)
-- Dependencies: 230
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 1, false);


--
-- TOC entry 4145 (class 0 OID 0)
-- Dependencies: 227
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_user_id_seq', 1, false);


-- Completed on 2025-09-02 15:09:21 +03

--
-- PostgreSQL database dump complete
--

