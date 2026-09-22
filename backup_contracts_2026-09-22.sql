--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

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
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: ruslan
--

COPY public.contracts (id, "contractNumber", "contractDate", status, "directionId", "managerId", "deliveryId", "surveyorId", "validityStart", "validityEnd", "installationDate", "deliveryDate", "customerName", "customerAddress", "customerPhone", "customerId", discount, "totalAmount", "advanceAmount", notes, source, "preferredExecutorId", "measurementId", "actWorkStartDate", "actWorkEndDate", "goodsTransferDate", installers, "createdAt", "updatedAt", "actWorkEndImages", "actWorkStartImages", "contractDurationDays", "contractDurationType", "installationDurationDays", "officeId", "complexObjectId") FROM stdin;
cmlhwf2a00005i0dab78wk64d	125д-10	2026-02-11	ACTIVE	cmlgf1312001c10raezypjsve	\N	\N	\N	\N	2026-05-06	\N	\N	Иванов	Мурманск Ленина 5	\N	\N	500.00	10000.00	0.00	\N	\N	\N	\N	\N	\N	\N	{}	2026-02-11 10:40:14.665	2026-02-11 10:58:23.491	{}	{}	60	WORKING	\N	\N	cmlhoxrgt00008zbhvopkkybv
cmlggw5nv00017gs2jew21wf4	125-9	2026-02-10	DRAFT	cmlgf130s001710raocqdn0nh	cmki80don000090n5lqzqbov0	\N	\N	\N	2026-05-05	\N	\N	Иванов	Мурманск Ленина 5	89646845744	\N	0.00	500.00	0.00	ооооо вввв	\N	\N	cmlgfmges0001ns4ea37wyjt5	\N	\N	\N	{}	2026-02-10 10:37:52.17	2026-02-12 10:39:45.618	{}	{}	60	WORKING	\N	\N	cmlhoxrgt00008zbhvopkkybv
\.


--
-- Data for Name: contract_advances; Type: TABLE DATA; Schema: public; Owner: ruslan
--

COPY public.contract_advances (id, "contractId", amount, "paidAt", notes) FROM stdin;
cmlghe5180001wsjg47e1csul	cmlggw5nv00017gs2jew21wf4	100.00	2026-02-10	\N
\.


--
-- Data for Name: contract_amendments; Type: TABLE DATA; Schema: public; Owner: ruslan
--

COPY public.contract_amendments (id, "contractId", amount, date, "extendsValidityTo", notes, "durationAdditionDays", "durationAdditionType", number, discount) FROM stdin;
cmlgk8ngv0001aui84fqiem5p	cmlggw5nv00017gs2jew21wf4	1000.00	2026-02-10	\N	\N	10	WORKING	\N	0.00
cmlglah160001etcnxuj6oncu	cmlggw5nv00017gs2jew21wf4	1000.00	2026-02-10	\N	\N	3	CALENDAR	2	5.00
cmlglbcqs0003etcngq4uire6	cmlggw5nv00017gs2jew21wf4	3000.00	2026-02-10	\N	\N	5	CALENDAR	3	7.00
\.


--
-- Data for Name: contract_history; Type: TABLE DATA; Schema: public; Owner: ruslan
--

COPY public.contract_history (id, "contractId", snapshot, "changedFields", action, "changedById", "changedAt") FROM stdin;
cmlhoxrht00028zbhgxisbmav	cmlggw5nv00017gs2jew21wf4	{"notes": "ооооо вввв", "source": null, "status": "DRAFT", "discount": 0, "officeId": null, "managerId": "cmki80don000090n5lqzqbov0", "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf130s001710raocqdn0nh", "totalAmount": 500, "validityEnd": "2026-05-05", "contractDate": "2026-02-10", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": "89646845744", "measurementId": "cmlgfmges0001ns4ea37wyjt5", "validityStart": null, "actWorkEndDate": null, "contractNumber": "125-9", "complexObjectId": null, "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{status,complexObjectId,discount,advanceAmount,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-11 07:10:50.225
cmlhx2eeg0001s2ietuwerczx	cmlhwf2a00005i0dab78wk64d	{"notes": null, "source": null, "status": "ACTIVE", "discount": 500, "officeId": null, "managerId": null, "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf1312001c10raezypjsve", "totalAmount": 10000, "validityEnd": "2026-05-06", "contractDate": "2026-02-11", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": null, "measurementId": null, "validityStart": null, "actWorkEndDate": null, "contractNumber": "125-10", "complexObjectId": "cmlhoxrgt00008zbhvopkkybv", "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{contractNumber,contractDate,status,directionId,complexObjectId,validityEnd,contractDurationDays,contractDurationType,installationDurationDays,customerName,customerAddress,discount,totalAmount,advanceAmount,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-11 10:58:23.464
cmljbc0jn00017upopvho8d3j	cmlggw5nv00017gs2jew21wf4	{"notes": "ооооо вввв", "source": null, "status": "DRAFT", "discount": 0, "officeId": null, "managerId": "cmki80don000090n5lqzqbov0", "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf130s001710raocqdn0nh", "totalAmount": 500, "validityEnd": "2026-05-05", "contractDate": "2026-02-10", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": "89646845744", "measurementId": "cmlgfmges0001ns4ea37wyjt5", "validityStart": null, "actWorkEndDate": null, "contractNumber": "125-9", "complexObjectId": "cmlhoxrgt00008zbhvopkkybv", "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{contractNumber,contractDate,status,directionId,managerId,complexObjectId,validityEnd,contractDurationDays,contractDurationType,installationDurationDays,customerName,customerAddress,customerPhone,discount,totalAmount,advanceAmount,notes,measurementId,actWorkEndDate,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-12 10:25:32.865
cmljbonus00037upompt5gylm	cmlggw5nv00017gs2jew21wf4	{"notes": "ооооо вввв", "source": null, "status": "DRAFT", "discount": 0, "officeId": null, "managerId": "cmki80don000090n5lqzqbov0", "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf130s001710raocqdn0nh", "totalAmount": 500, "validityEnd": "2026-05-05", "contractDate": "2026-02-10", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": "89646845744", "measurementId": "cmlgfmges0001ns4ea37wyjt5", "validityStart": null, "actWorkEndDate": "2026-02-12", "contractNumber": "125-9", "complexObjectId": "cmlhoxrgt00008zbhvopkkybv", "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{contractNumber,contractDate,status,directionId,managerId,complexObjectId,validityEnd,contractDurationDays,contractDurationType,installationDurationDays,customerName,customerAddress,customerPhone,discount,totalAmount,advanceAmount,notes,measurementId,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-12 10:35:22.948
cmljbox8400057upou3i7k1j7	cmlggw5nv00017gs2jew21wf4	{"notes": "ооооо вввв", "source": null, "status": "DRAFT", "discount": 0, "officeId": null, "managerId": "cmki80don000090n5lqzqbov0", "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf130s001710raocqdn0nh", "totalAmount": 500, "validityEnd": "2026-05-05", "contractDate": "2026-02-10", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": "89646845744", "measurementId": "cmlgfmges0001ns4ea37wyjt5", "validityStart": null, "actWorkEndDate": "2026-02-12", "contractNumber": "125-9", "complexObjectId": "cmlhoxrgt00008zbhvopkkybv", "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{contractNumber,contractDate,status,directionId,managerId,complexObjectId,validityEnd,contractDurationDays,contractDurationType,installationDurationDays,customerName,customerAddress,customerPhone,discount,totalAmount,advanceAmount,notes,measurementId,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-12 10:35:35.092
cmljbp5yb00077upojd9s0an4	cmlggw5nv00017gs2jew21wf4	{"notes": "ооооо вввв", "source": null, "status": "DRAFT", "discount": 0, "officeId": null, "managerId": "cmki80don000090n5lqzqbov0", "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf130s001710raocqdn0nh", "totalAmount": 500, "validityEnd": "2026-05-05", "contractDate": "2026-02-10", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": "89646845744", "measurementId": "cmlgfmges0001ns4ea37wyjt5", "validityStart": null, "actWorkEndDate": "2026-02-12", "contractNumber": "125-9", "complexObjectId": "cmlhoxrgt00008zbhvopkkybv", "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{contractNumber,contractDate,status,directionId,managerId,complexObjectId,validityEnd,contractDurationDays,contractDurationType,installationDurationDays,customerName,customerAddress,customerPhone,discount,totalAmount,advanceAmount,notes,measurementId,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-12 10:35:46.403
cmljbu91w0001dr4mi47cw8a2	cmlggw5nv00017gs2jew21wf4	{"notes": "ооооо вввв", "source": null, "status": "DRAFT", "discount": 0, "officeId": null, "managerId": "cmki80don000090n5lqzqbov0", "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf130s001710raocqdn0nh", "totalAmount": 500, "validityEnd": "2026-05-05", "contractDate": "2026-02-10", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": "89646845744", "measurementId": "cmlgfmges0001ns4ea37wyjt5", "validityStart": null, "actWorkEndDate": "2026-02-12", "contractNumber": "125-9", "complexObjectId": "cmlhoxrgt00008zbhvopkkybv", "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{contractNumber,contractDate,status,directionId,managerId,complexObjectId,validityEnd,contractDurationDays,contractDurationType,installationDurationDays,customerName,customerAddress,customerPhone,discount,totalAmount,advanceAmount,notes,measurementId,actWorkEndDate,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-12 10:39:43.701
cmljbuaj50003dr4m8dp0p3xz	cmlggw5nv00017gs2jew21wf4	{"notes": "ооооо вввв", "source": null, "status": "DRAFT", "discount": 0, "officeId": null, "managerId": "cmki80don000090n5lqzqbov0", "customerId": null, "deliveryId": null, "installers": [], "surveyorId": null, "directionId": "cmlgf130s001710raocqdn0nh", "totalAmount": 500, "validityEnd": "2026-05-05", "contractDate": "2026-02-10", "customerName": "Иванов", "deliveryDate": null, "advanceAmount": 0, "customerPhone": "89646845744", "measurementId": "cmlgfmges0001ns4ea37wyjt5", "validityStart": null, "actWorkEndDate": null, "contractNumber": "125-9", "complexObjectId": "cmlhoxrgt00008zbhvopkkybv", "customerAddress": "Мурманск Ленина 5", "actWorkEndImages": [], "actWorkStartDate": null, "installationDate": null, "goodsTransferDate": null, "actWorkStartImages": [], "preferredExecutorId": null, "contractDurationDays": 60, "contractDurationType": "WORKING", "installationDurationDays": null}	{contractNumber,contractDate,status,directionId,managerId,complexObjectId,validityEnd,contractDurationDays,contractDurationType,installationDurationDays,customerName,customerAddress,customerPhone,discount,totalAmount,advanceAmount,notes,measurementId,actWorkEndDate,installers,actWorkStartImages,actWorkEndImages}	UPDATE	cmkl6cmkx0000ao6cln2v2zfj	2026-02-12 10:39:45.617
\.


--
-- Data for Name: contract_payments; Type: TABLE DATA; Schema: public; Owner: ruslan
--

COPY public.contract_payments (id, "contractId", "paymentDate", amount, "paymentForm", "paymentType", "managerId", notes, "createdAt", "collectionAmount") FROM stdin;
cmlhylkzc0001zmfwnpstw1f7	cmlhwf2a00005i0dab78wk64d	2026-02-11	3000.00	CASH	PREPAYMENT	\N	\N	2026-02-11 11:41:18.072	\N
cmli0uf0a000112t86meqbko0	cmlhwf2a00005i0dab78wk64d	2026-02-11	1000.00	TERMINAL	ADVANCE	\N	\N	2026-02-11 12:44:09.466	\N
cmlgidb6v000333fmfemlg2gz	cmlggw5nv00017gs2jew21wf4	2026-02-10	150.00	CASH	ADVANCE	cmki80don000090n5lqzqbov0	\N	2026-02-10 11:19:12.103	150.00
cmlgi8fg5000133fmukd60nhu	cmlggw5nv00017gs2jew21wf4	2026-02-10	100.00	CASH	PREPAYMENT	cmki80don000090n5lqzqbov0	\N	2026-02-10 11:15:24.341	100.00
\.


--
-- PostgreSQL database dump complete
--

