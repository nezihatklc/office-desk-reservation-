--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-08-24 00:48:01 +03

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
-- TOC entry 4127 (class 0 OID 22624)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, first_name, last_name, email, password, created, created_by) FROM stdin;
1	Ahmet Furkan	Demir	furkand@example.com	1234	2025-08-22 10:15:17.905027+03	1
\.


--
-- TOC entry 4134 (class 0 OID 22770)
-- Dependencies: 226
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (log_id, user_id, action, log_time) FROM stdin;
1	1	This desk has already booked from user_id = 1	2025-08-22 10:48:29.226154+03
\.


--
-- TOC entry 4128 (class 0 OID 22694)
-- Dependencies: 220
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workspaces (workspace_id, workspace_name, floor_number, desk_code, created) FROM stdin;
1	Zone A	2nd Floor	D-01	2025-08-22 10:34:00.047488+03
\.


--
-- TOC entry 4129 (class 0 OID 22705)
-- Dependencies: 221
-- Data for Name: desks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.desks (desk_id, workspace_id, desk_code, isactive, created, created_by) FROM stdin;
1	1	D-10	t	2025-08-22 10:37:13.282371+03	1
\.


--
-- TOC entry 4131 (class 0 OID 22724)
-- Dependencies: 223
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (booking_id, user_id, desk_id, booking_start, booking_end, status, created) FROM stdin;
1	1	1	2025-08-22 09:00:00+03	2025-08-22 18:00:00+03	Booked	2025-08-22 10:41:15.562089+03
\.


--
-- TOC entry 4132 (class 0 OID 22743)
-- Dependencies: 224
-- Data for Name: facilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.facilities (facility_id, name, description) FROM stdin;
1	Facility 1	Standard One Monitor
\.


--
-- TOC entry 4133 (class 0 OID 22752)
-- Dependencies: 225
-- Data for Name: desk_facilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.desk_facilities (desk_id, facility_id) FROM stdin;
1	1
\.


--
-- TOC entry 4135 (class 0 OID 22788)
-- Dependencies: 227
-- Data for Name: meeting_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meeting_rooms (room_id, room_name, capacity, isavailable, created, created_by) FROM stdin;
\.


--
-- TOC entry 4141 (class 0 OID 0)
-- Dependencies: 222
-- Name: bookings_booking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_booking_id_seq', 1, false);


-- Completed on 2025-08-24 00:48:01 +03

--
-- PostgreSQL database dump complete
--

