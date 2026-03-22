export type ComicStatus = 'pending' | 'generating' | 'completed' | 'failed'
export type ComicStyle = 'manga' | 'american' | 'watercolor' | 'pixel' | 'minimalist'
export type ComicGenre = 'comedy' | 'adventure' | 'horror' | 'sci-fi' | 'slice-of-life' | 'romance'
export type DialoguePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type BubbleStyle = 'speech' | 'thought' | 'narration'

export interface DialogueLine {
  character: string
  text: string
  position: DialoguePosition
  bubble_style: BubbleStyle
}

export interface Panel {
  id: string
  seq_order: number
  image_url: string
  dialogue: DialogueLine[]
}

export interface Comic {
  id: string
  title: string
  theme: string
  genre: ComicGenre
  style: ComicStyle
  panel_count: number
  status: ComicStatus
  is_public: boolean
  share_token: string | null
  created_at: string
  panels: Panel[]
}

export interface ComicListItem {
  id: string
  title: string
  genre: ComicGenre
  style: ComicStyle
  panel_count: number
  status: ComicStatus
  cover_image_url: string
  created_at: string
}

export interface ComicStatusResponse {
  id: string
  status: ComicStatus
  total_panels: number
  completed_panels: number
}

export interface GenerateComicRequest {
  theme: string
  genre: ComicGenre
  style: ComicStyle
  panel_count: 4 | 8 | 12
}
