import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getAuthHeadersMultipart(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export type SalesCandidateStatus =
  | 'NEW'
  | 'QUESTIONNAIRE'
  | 'INTERVIEW'
  | 'TRAINING'
  | 'TEST_TASK'
  | 'REJECTED'
  | 'HIRED';

export interface WorkHistoryItem {
  company: string;
  position: string;
  period?: string;
  duties?: string;
  achievements?: string;
}

export interface ParsedResumeData {
  emails: string[];
  phones: string[];
  skills: string[];
  experienceYears: number | null;
  educationHints: string[];
  jobTitles: string[];
  summary: string;
}

export interface CandidateScoreBreakdown {
  softSkillsScore: number | null;
  experienceScore: number | null;
  interviewScore: number | null;
  trainingScore: number | null;
  resumeScore: number | null;
  overallScore: number | null;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CandidateTrainingProgress {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  trackableCount: number;
  completedCount: number;
  completionPercent: number;
  videosCompleted: number;
  quizzesPassed: number;
  lastActivityAt: string | null;
  materials: Array<{
    materialId: string;
    title: string;
    type: string;
    categoryName: string;
    hasQuiz: boolean;
    completed: boolean;
    inProgress: boolean;
    videoProgressPercent: number | null;
    quizPassed: boolean | null;
    quizScorePercent: number | null;
  }>;
}

export type RecruitmentCampaignStatus = 'OPEN' | 'CLOSED';

export interface RecruitmentCampaign {
  id: string;
  title: string;
  status: RecruitmentCampaignStatus;
  startedAt: string;
  closedAt: string | null;
  notes: string | null;
  selectedCandidateId: string | null;
  selectedCandidate: {
    id: string;
    fullName: string;
    overallScore: number | null;
  } | null;
  candidatesCount: number;
}

export interface SalesCandidate {
  id: string;
  campaignId: string;
  campaign?: {
    id: string;
    title: string;
    status: RecruitmentCampaignStatus;
  };
  lastName: string;
  firstName: string;
  middleName: string | null;
  birthDate: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  educationLevel: string | null;
  educationInstitution: string | null;
  educationSpecialty: string | null;
  educationYear: number | null;
  additionalEducation: string | null;
  totalExperienceYears: number | null;
  salesExperienceYears: number | null;
  workHistory: WorkHistoryItem[] | null;
  industryExperience: string[];
  salesAchievements: string | null;
  communicationSkill: number | null;
  stressResistance: number | null;
  motivation: number | null;
  teamworkSkill: number | null;
  selfOrganization: number | null;
  pcSkill: number | null;
  presentationSkill: number | null;
  motivationReason: string | null;
  salaryExpectation: string | null;
  availableFrom: string | null;
  hasDriversLicense: boolean | null;
  hasPersonalCar: boolean | null;
  readyForTravel: boolean | null;
  productKnowledge: string | null;
  interviewDate: string | null;
  interviewScore: number | null;
  interviewNotes: string | null;
  adminNotes: string | null;
  resumeFileUrl: string | null;
  resumeFileName: string | null;
  resumeParsedText: string | null;
  resumeParsedData: ParsedResumeData | null;
  traineeUserId: string | null;
  status: SalesCandidateStatus;
  overallScore: number | null;
  createdAt: string;
  updatedAt: string;
  traineeUser?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
  trainingProgress?: CandidateTrainingProgress | null;
  scoreBreakdown?: CandidateScoreBreakdown;
}

export type SalesCandidateFormData = Omit<
  SalesCandidate,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'traineeUser'
  | 'trainingProgress'
  | 'scoreBreakdown'
  | 'resumeParsedText'
  | 'resumeParsedData'
  | 'overallScore'
>;

export interface CandidatesListResponse {
  items: SalesCandidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComparisonAnalytics {
  campaign: RecruitmentCampaign | null;
  summary: {
    totalCandidates: number;
    avgScore: number;
    avgTrainingCompletion: number;
    withTrainingCount: number;
    withResumeCount: number;
    statusCounts: Record<string, number>;
  };
  topRecommendation: {
    candidateId: string;
    fullName: string;
    overallScore: number | null;
    recommendation: string;
    strengths: string[];
  } | null;
  candidates: Array<{
    id: string;
    fullName: string;
    status: SalesCandidateStatus;
    phone: string;
    email: string | null;
    salesExperienceYears: number | null;
    interviewScore: number | null;
    overallScore: number | null;
    scoreBreakdown: CandidateScoreBreakdown;
    trainingProgress: {
      completionPercent: number;
      completedCount: number;
      trackableCount: number;
      lastActivityAt: string | null;
    } | null;
    hasResume: boolean;
    createdAt: string;
    rank: number;
  }>;
}

export const CANDIDATE_STATUS_LABELS: Record<SalesCandidateStatus, string> = {
  NEW: 'Новый',
  QUESTIONNAIRE: 'Анкета заполнена',
  INTERVIEW: 'Собеседование',
  TRAINING: 'Обучение',
  TEST_TASK: 'Тестовое задание',
  REJECTED: 'Отклонён',
  HIRED: 'Принят',
};

export const INDUSTRY_OPTIONS = [
  'Двери',
  'Мебель',
  'Ремонт квартир',
  'Строительство',
  'Отделочные материалы',
  'Окна',
  'Кухни',
  'Другое',
];

export const EDUCATION_LEVELS = ['Среднее', 'Среднее специальное', 'Высшее', 'MBA / магистратура'];

export async function fetchCandidates(params?: {
  search?: string;
  status?: SalesCandidateStatus;
  campaignId?: string;
  page?: number;
  limit?: number;
}): Promise<CandidatesListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.campaignId) qs.set('campaignId', params.campaignId);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiFetch(`${API_URL}/admin/recruitment${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });
  return parseJson<CandidatesListResponse>(res);
}

export async function fetchCandidate(id: string): Promise<SalesCandidate> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/${id}`, { headers: getAuthHeaders() });
  return parseJson<SalesCandidate>(res);
}

export async function createCandidate(
  data: Partial<SalesCandidateFormData>
): Promise<SalesCandidate> {
  const res = await apiFetch(`${API_URL}/admin/recruitment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return parseJson<SalesCandidate>(res);
}

export async function updateCandidate(
  id: string,
  data: Partial<SalesCandidateFormData>
): Promise<SalesCandidate> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return parseJson<SalesCandidate>(res);
}

export async function deleteCandidate(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseJson<{ success: boolean }>(res);
}

export async function uploadAndParseResume(id: string, file: File): Promise<SalesCandidate> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_URL}/admin/recruitment/${id}/parse-resume`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });
  return parseJson<SalesCandidate>(res);
}

export async function linkTraineeByEmail(id: string, email: string): Promise<SalesCandidate> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/${id}/link-trainee`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJson<SalesCandidate>(res);
}

export async function unlinkTraineeUser(id: string): Promise<SalesCandidate> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/${id}/unlink-trainee`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseJson<SalesCandidate>(res);
}

export async function fetchComparisonAnalytics(campaignId?: string): Promise<ComparisonAnalytics> {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  const res = await apiFetch(`${API_URL}/admin/recruitment/analytics/comparison${qs}`, {
    headers: getAuthHeaders(),
  });
  return parseJson<ComparisonAnalytics>(res);
}

export async function fetchRecruitmentCampaigns(): Promise<RecruitmentCampaign[]> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/campaigns`, {
    headers: getAuthHeaders(),
  });
  return parseJson<RecruitmentCampaign[]>(res);
}

export async function fetchActiveRecruitmentCampaign(): Promise<RecruitmentCampaign | null> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/campaigns/active`, {
    headers: getAuthHeaders(),
  });
  return parseJson<RecruitmentCampaign | null>(res);
}

export async function createRecruitmentCampaign(title: string): Promise<RecruitmentCampaign> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/campaigns`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  return parseJson<RecruitmentCampaign>(res);
}

export async function closeRecruitmentCampaign(
  campaignId: string,
  data: { selectedCandidateId?: string; notes?: string }
): Promise<RecruitmentCampaign> {
  const res = await apiFetch(`${API_URL}/admin/recruitment/campaigns/${campaignId}/close`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return parseJson<RecruitmentCampaign>(res);
}

export function getFullName(c: Pick<SalesCandidate, 'lastName' | 'firstName' | 'middleName'>) {
  return [c.lastName, c.firstName, c.middleName].filter(Boolean).join(' ');
}

export type RecruitmentFormState = {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  educationLevel: string;
  educationInstitution: string;
  educationSpecialty: string;
  educationYear: number | undefined;
  additionalEducation: string;
  totalExperienceYears: number | undefined;
  salesExperienceYears: number | undefined;
  workHistory: WorkHistoryItem[];
  industryExperience: string[];
  salesAchievements: string;
  communicationSkill: number | undefined;
  stressResistance: number | undefined;
  motivation: number | undefined;
  teamworkSkill: number | undefined;
  selfOrganization: number | undefined;
  pcSkill: number | undefined;
  presentationSkill: number | undefined;
  motivationReason: string;
  salaryExpectation: string;
  availableFrom: string;
  hasDriversLicense: boolean | undefined;
  hasPersonalCar: boolean | undefined;
  readyForTravel: boolean | undefined;
  productKnowledge: string;
  interviewDate: string;
  interviewScore: number | undefined;
  interviewNotes: string;
  adminNotes: string;
  resumeFileUrl: string;
  resumeFileName: string;
  traineeUserId: string;
  status: SalesCandidateStatus;
};

export function emptyCandidateForm(): RecruitmentFormState {
  return {
    lastName: '',
    firstName: '',
    middleName: '',
    birthDate: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    educationLevel: '',
    educationInstitution: '',
    educationSpecialty: '',
    educationYear: undefined,
    additionalEducation: '',
    totalExperienceYears: undefined,
    salesExperienceYears: undefined,
    workHistory: [],
    industryExperience: [],
    salesAchievements: '',
    communicationSkill: undefined,
    stressResistance: undefined,
    motivation: undefined,
    teamworkSkill: undefined,
    selfOrganization: undefined,
    pcSkill: undefined,
    presentationSkill: undefined,
    motivationReason: '',
    salaryExpectation: '',
    availableFrom: '',
    hasDriversLicense: undefined,
    hasPersonalCar: undefined,
    readyForTravel: undefined,
    productKnowledge: '',
    interviewDate: '',
    interviewScore: undefined,
    interviewNotes: '',
    adminNotes: '',
    resumeFileUrl: '',
    resumeFileName: '',
    traineeUserId: '',
    status: 'NEW',
  };
}

export function candidateToFormData(c: SalesCandidate): RecruitmentFormState {
  return {
    lastName: c.lastName,
    firstName: c.firstName,
    middleName: c.middleName ?? '',
    birthDate: c.birthDate ? c.birthDate.slice(0, 10) : '',
    phone: c.phone,
    email: c.email ?? '',
    city: c.city ?? '',
    address: c.address ?? '',
    educationLevel: c.educationLevel ?? '',
    educationInstitution: c.educationInstitution ?? '',
    educationSpecialty: c.educationSpecialty ?? '',
    educationYear: c.educationYear ?? undefined,
    additionalEducation: c.additionalEducation ?? '',
    totalExperienceYears: c.totalExperienceYears ?? undefined,
    salesExperienceYears: c.salesExperienceYears ?? undefined,
    workHistory: (c.workHistory as WorkHistoryItem[]) ?? [],
    industryExperience: c.industryExperience ?? [],
    salesAchievements: c.salesAchievements ?? '',
    communicationSkill: c.communicationSkill ?? undefined,
    stressResistance: c.stressResistance ?? undefined,
    motivation: c.motivation ?? undefined,
    teamworkSkill: c.teamworkSkill ?? undefined,
    selfOrganization: c.selfOrganization ?? undefined,
    pcSkill: c.pcSkill ?? undefined,
    presentationSkill: c.presentationSkill ?? undefined,
    motivationReason: c.motivationReason ?? '',
    salaryExpectation: c.salaryExpectation ?? '',
    availableFrom: c.availableFrom ? c.availableFrom.slice(0, 10) : '',
    hasDriversLicense: c.hasDriversLicense ?? undefined,
    hasPersonalCar: c.hasPersonalCar ?? undefined,
    readyForTravel: c.readyForTravel ?? undefined,
    productKnowledge: c.productKnowledge ?? '',
    interviewDate: c.interviewDate ? c.interviewDate.slice(0, 10) : '',
    interviewScore: c.interviewScore ?? undefined,
    interviewNotes: c.interviewNotes ?? '',
    adminNotes: c.adminNotes ?? '',
    resumeFileUrl: c.resumeFileUrl ?? '',
    resumeFileName: c.resumeFileName ?? '',
    traineeUserId: c.traineeUserId ?? '',
    status: c.status,
  };
}
