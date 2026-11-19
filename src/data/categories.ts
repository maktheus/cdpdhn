import type { CategoryId } from './types';

export interface Category {
  id: CategoryId;
  title: string;
  short: string;
  description: string;
  available: boolean;
  /** Cor de identidade do ícone. Nunca carrega significado sozinha: sempre vem com o nome. */
  color: string;
  icon: 'users' | 'heart' | 'user-round' | 'tent' | 'leaf' | 'accessibility' | 'shield' | 'globe';
}

export const CATEGORIES: Category[] = [
  {
    id: 'criancas',
    title: 'Crianças e adolescentes',
    short: 'Crianças e adol.',
    description: 'Responsáveis, contato seguro, educação, saúde e proteção de direitos.',
    available: true,
    color: '#1E9254',
    icon: 'users'
  },
  {
    id: 'mulheres',
    title: 'Mulheres',
    short: 'Mulheres',
    description: 'Acolhimento, autonomia, proteção e garantia de direitos das mulheres.',
    available: false,
    color: '#C93D7A',
    icon: 'heart'
  },
  {
    id: 'idosa',
    title: 'Pessoa idosa',
    short: 'Pessoa idosa',
    description: 'Autonomia, cuidados, convivência e proteção.',
    available: false,
    color: '#8656C9',
    icon: 'user-round'
  },
  {
    id: 'situacao_rua',
    title: 'Pessoa em situação de rua',
    short: 'Situação de rua',
    description: 'Pernoite, necessidades básicas, vínculos, moradia e acesso à rede.',
    available: true,
    color: '#C98A0C',
    icon: 'tent'
  },
  {
    id: 'alcool_drogas',
    title: 'Usuário de álcool e outras drogas',
    short: 'Álcool e drogas',
    description: 'Redução de danos, cuidado em saúde, vínculos e acesso à rede.',
    available: true,
    color: '#13887D',
    icon: 'leaf'
  },
  {
    id: 'deficiencia',
    title: 'Pessoa com deficiência',
    short: 'Deficiência',
    description: 'Acessibilidade, apoios e garantia de direitos.',
    available: true,
    color: '#2A78B8',
    icon: 'accessibility'
  },
  {
    id: 'violencia',
    title: 'Pessoa em situação de violência',
    short: 'Violência',
    description: 'Proteção, contato seguro e acesso à rede de enfrentamento.',
    available: true,
    color: '#B2512B',
    icon: 'shield'
  },
  {
    id: 'migrantes',
    title: 'Migrantes e refugiados',
    short: 'Migrantes',
    description: 'Documentação, acolhimento e regularização migratória.',
    available: true,
    color: '#557A1C',
    icon: 'globe'
  }
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;
