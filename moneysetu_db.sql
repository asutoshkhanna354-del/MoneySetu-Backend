--
-- PostgreSQL database dump
--

\restrict 106aVPLrkKNaFKvWhI42C8pUShLcxrxbyN8itA3sc82XEExdTH6N5EFJWabusD8

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: fake_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fake_activity (
    id integer NOT NULL,
    user_name text NOT NULL,
    type text NOT NULL,
    amount numeric(15,2) NOT NULL,
    city text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fake_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fake_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fake_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fake_activity_id_seq OWNED BY public.fake_activity.id;


--
-- Name: investment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_plans (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    min_amount numeric(15,2) NOT NULL,
    max_amount numeric(15,2) NOT NULL,
    daily_return_percent numeric(5,2) NOT NULL,
    duration_days integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    image_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: investment_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.investment_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: investment_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.investment_plans_id_seq OWNED BY public.investment_plans.id;


--
-- Name: referral_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_commissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    from_user_id integer NOT NULL,
    level integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    source_amount numeric(15,2) NOT NULL,
    type text DEFAULT 'deposit'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: referral_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_commissions_id_seq OWNED BY public.referral_commissions.id;


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: site_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    amount numeric(15,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user_investments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_investments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plan_id integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    daily_return_percent numeric(5,2) NOT NULL,
    duration_days integer NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    start_date timestamp without time zone DEFAULT now() NOT NULL,
    end_date timestamp without time zone NOT NULL,
    total_earned numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_investments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_investments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_investments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_investments_id_seq OWNED BY public.user_investments.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    username text,
    phone text,
    password_hash text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    referral_code text NOT NULL,
    referred_by text,
    balance numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_invested numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_earnings numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: fake_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fake_activity ALTER COLUMN id SET DEFAULT nextval('public.fake_activity_id_seq'::regclass);


--
-- Name: investment_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_plans ALTER COLUMN id SET DEFAULT nextval('public.investment_plans_id_seq'::regclass);


--
-- Name: referral_commissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commissions ALTER COLUMN id SET DEFAULT nextval('public.referral_commissions_id_seq'::regclass);


--
-- Name: site_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_investments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_investments ALTER COLUMN id SET DEFAULT nextval('public.user_investments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: fake_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fake_activity (id, user_name, type, amount, city, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: investment_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investment_plans (id, name, description, min_amount, max_amount, daily_return_percent, duration_days, is_active, image_url, created_at) FROM stdin;
2	Gold	Balanced returns for growing investors	10000.00	49999.00	3.00	60	t	https://lh3.googleusercontent.com/d/16bmT3DfV4OXDMfUbO0NkHyo1osxR952D	2026-03-30 08:42:02.699482
3	Platinum	High-yield returns for serious investors	50000.00	199999.00	4.00	90	t	https://lh3.googleusercontent.com/d/1G7RGSDX0ZrfzyQWY_NG0U8iYh2WzAdQN	2026-03-30 08:42:02.699482
4	Diamond	Maximum returns for elite investors	200000.00	10000000.00	5.00	180	t	https://lh3.googleusercontent.com/d/1SDAdZJ-OuwUh1IeC1grksgzVBw3V1G17	2026-03-30 08:42:02.699482
5	Bronze	Starter plan — perfect for first-time investors	100.00	4999.00	1.00	15	t	https://lh3.googleusercontent.com/d/1Y_h7mitEwxSrn8R1AFG6mD-JFlmLBCIu	2026-03-30 10:30:54.284753
1	Silver	Entry-level plan for new investors	5000.00	9999.00	2.00	30	t	https://lh3.googleusercontent.com/d/1Pjla3LhhFiqV4YMKpfp_sGggnFMuRfp7	2026-03-30 08:42:02.699482
\.


--
-- Data for Name: referral_commissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referral_commissions (id, user_id, from_user_id, level, amount, source_amount, type, created_at) FROM stdin;
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, user_id, type, amount, status, payment_method, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_investments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_investments (id, user_id, plan_id, amount, daily_return_percent, duration_days, status, start_date, end_date, total_earned, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, username, phone, password_hash, is_admin, referral_code, referred_by, balance, total_invested, total_earnings, created_at) FROM stdin;
1	Admin	admin	\N	$2b$10$WOSP/mYl4ULZDujUuvMwWuaN2z3szwyp2NQ1VrXwDZ7Us2LpwCNDu	t	ADMIN001	\N	0.00	0.00	0.00	2026-03-30 08:42:02.688829
\.


--
-- Name: fake_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fake_activity_id_seq', 1, false);


--
-- Name: investment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.investment_plans_id_seq', 5, true);


--
-- Name: referral_commissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.referral_commissions_id_seq', 1, false);


--
-- Name: site_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.site_settings_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: user_investments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_investments_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: fake_activity fake_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fake_activity
    ADD CONSTRAINT fake_activity_pkey PRIMARY KEY (id);


--
-- Name: investment_plans investment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_plans
    ADD CONSTRAINT investment_plans_pkey PRIMARY KEY (id);


--
-- Name: referral_commissions referral_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commissions
    ADD CONSTRAINT referral_commissions_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_unique UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_investments user_investments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_investments
    ADD CONSTRAINT user_investments_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: referral_commissions referral_commissions_from_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commissions
    ADD CONSTRAINT referral_commissions_from_user_id_users_id_fk FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- Name: referral_commissions referral_commissions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commissions
    ADD CONSTRAINT referral_commissions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_investments user_investments_plan_id_investment_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_investments
    ADD CONSTRAINT user_investments_plan_id_investment_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.investment_plans(id);


--
-- Name: user_investments user_investments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_investments
    ADD CONSTRAINT user_investments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 106aVPLrkKNaFKvWhI42C8pUShLcxrxbyN8itA3sc82XEExdTH6N5EFJWabusD8

