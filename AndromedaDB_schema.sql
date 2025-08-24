--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-08-24 00:44:20 +03

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
-- TOC entry 2 (class 3079 OID 21865)
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- TOC entry 4143 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- TOC entry 3 (class 3079 OID 22515)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- TOC entry 4144 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 22770)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    log_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 22724)
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    booking_id integer NOT NULL,
    user_id integer NOT NULL,
    desk_id integer NOT NULL,
    booking_start timestamp with time zone DEFAULT (date_trunc('day'::text, CURRENT_TIMESTAMP) + '09:00:00'::interval) NOT NULL,
    booking_end timestamp with time zone DEFAULT (date_trunc('day'::text, CURRENT_TIMESTAMP) + '18:00:00'::interval) NOT NULL,
    status character varying(50),
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 22723)
-- Name: bookings_booking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_booking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_booking_id_seq OWNER TO postgres;

--
-- TOC entry 4145 (class 0 OID 0)
-- Dependencies: 222
-- Name: bookings_booking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bookings_booking_id_seq OWNED BY public.bookings.booking_id;


--
-- TOC entry 225 (class 1259 OID 22752)
-- Name: desk_facilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.desk_facilities (
    desk_id integer NOT NULL,
    facility_id integer NOT NULL
);


ALTER TABLE public.desk_facilities OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 22705)
-- Name: desks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.desks (
    desk_id integer NOT NULL,
    workspace_id integer NOT NULL,
    desk_code character varying(20) NOT NULL,
    isactive boolean NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer
);


ALTER TABLE public.desks OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 22743)
-- Name: facilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facilities (
    facility_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.facilities OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 22788)
-- Name: meeting_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meeting_rooms (
    room_id integer NOT NULL,
    room_name character varying(50) NOT NULL,
    capacity integer NOT NULL,
    isavailable boolean,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    CONSTRAINT meeting_rooms_capacity_check CHECK ((capacity > 0))
);


ALTER TABLE public.meeting_rooms OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 22624)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    email public.citext NOT NULL,
    password character varying(100) NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 22694)
-- Name: workspaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspaces (
    workspace_id integer NOT NULL,
    workspace_name character varying(50) NOT NULL,
    floor_number text DEFAULT '2nd Floor'::text NOT NULL,
    desk_code character varying(20) NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.workspaces OWNER TO postgres;

--
-- TOC entry 3944 (class 2604 OID 22727)
-- Name: bookings booking_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings ALTER COLUMN booking_id SET DEFAULT nextval('public.bookings_booking_id_seq'::regclass);


--
-- TOC entry 3978 (class 2606 OID 22775)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- TOC entry 3965 (class 2606 OID 22732)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (booking_id);


--
-- TOC entry 3976 (class 2606 OID 22756)
-- Name: desk_facilities desk_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desk_facilities
    ADD CONSTRAINT desk_facilities_pkey PRIMARY KEY (desk_id, facility_id);


--
-- TOC entry 3960 (class 2606 OID 22712)
-- Name: desks desks_desk_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desks
    ADD CONSTRAINT desks_desk_code_key UNIQUE (desk_code);


--
-- TOC entry 3962 (class 2606 OID 22710)
-- Name: desks desks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desks
    ADD CONSTRAINT desks_pkey PRIMARY KEY (desk_id);


--
-- TOC entry 3972 (class 2606 OID 22751)
-- Name: facilities facilities_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_name_key UNIQUE (name);


--
-- TOC entry 3974 (class 2606 OID 22749)
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (facility_id);


--
-- TOC entry 3981 (class 2606 OID 22794)
-- Name: meeting_rooms meeting_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_pkey PRIMARY KEY (room_id);


--
-- TOC entry 3983 (class 2606 OID 22796)
-- Name: meeting_rooms meeting_rooms_room_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_room_name_key UNIQUE (room_name);


--
-- TOC entry 3970 (class 2606 OID 22787)
-- Name: bookings no_overlap_booking_per_desk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT no_overlap_booking_per_desk EXCLUDE USING gist (desk_id WITH =, tstzrange(booking_start, booking_end) WITH &&);


--
-- TOC entry 3952 (class 2606 OID 22633)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3954 (class 2606 OID 22631)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3956 (class 2606 OID 22704)
-- Name: workspaces workspaces_desk_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_desk_code_key UNIQUE (desk_code);


--
-- TOC entry 3958 (class 2606 OID 22702)
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (workspace_id);


--
-- TOC entry 3979 (class 1259 OID 22785)
-- Name: idx_audit_user_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_user_time ON public.audit_logs USING btree (user_id, log_time);


--
-- TOC entry 3966 (class 1259 OID 22782)
-- Name: idx_bookings_desk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_desk ON public.bookings USING btree (desk_id);


--
-- TOC entry 3967 (class 1259 OID 22783)
-- Name: idx_bookings_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_time ON public.bookings USING btree (booking_start, booking_end);


--
-- TOC entry 3968 (class 1259 OID 22781)
-- Name: idx_bookings_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_user ON public.bookings USING btree (user_id);


--
-- TOC entry 3963 (class 1259 OID 22784)
-- Name: idx_desks_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_desks_workspace ON public.desks USING btree (workspace_id);


--
-- TOC entry 3991 (class 2606 OID 22776)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 3987 (class 2606 OID 22738)
-- Name: bookings bookings_desk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_desk_id_fkey FOREIGN KEY (desk_id) REFERENCES public.desks(desk_id) ON DELETE CASCADE;


--
-- TOC entry 3988 (class 2606 OID 22733)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3989 (class 2606 OID 22757)
-- Name: desk_facilities desk_facilities_desk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desk_facilities
    ADD CONSTRAINT desk_facilities_desk_id_fkey FOREIGN KEY (desk_id) REFERENCES public.desks(desk_id) ON DELETE CASCADE;


--
-- TOC entry 3990 (class 2606 OID 22762)
-- Name: desk_facilities desk_facilities_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desk_facilities
    ADD CONSTRAINT desk_facilities_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(facility_id) ON DELETE CASCADE;


--
-- TOC entry 3985 (class 2606 OID 22718)
-- Name: desks desks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desks
    ADD CONSTRAINT desks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3986 (class 2606 OID 22713)
-- Name: desks desks_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desks
    ADD CONSTRAINT desks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(workspace_id) ON DELETE CASCADE;


--
-- TOC entry 3992 (class 2606 OID 22797)
-- Name: meeting_rooms meeting_rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3984 (class 2606 OID 22634)
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


-- Completed on 2025-08-24 00:44:20 +03

--
-- PostgreSQL database dump complete
--

