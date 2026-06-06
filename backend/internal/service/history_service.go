package service

import "webconsole/internal/repository"

// HistoryService records play sessions and powers the "recent" shelf.
type HistoryService struct {
	hist  *repository.HistoryRepository
	games *repository.GameRepository
}

// NewHistoryService constructs a HistoryService.
func NewHistoryService(
	hist *repository.HistoryRepository,
	games *repository.GameRepository,
) *HistoryService {
	return &HistoryService{hist: hist, games: games}
}

// Record logs a play session: it adds elapsed seconds to the game's history and
// bumps its play count by one session.
func (s *HistoryService) Record(gameID string, seconds int64) error {
	if err := s.hist.Record(gameID, seconds); err != nil {
		return err
	}
	return s.games.IncrementPlayCount(gameID)
}

// Recent returns up to limit most-recently-played games, newest first.
func (s *HistoryService) Recent(limit int) ([]GameDTO, error) {
	ids, err := s.hist.RecentGameIDs(limit)
	if err != nil {
		return nil, err
	}
	games, err := s.games.ByIDs(ids)
	if err != nil {
		return nil, err
	}
	// Re-order to match the recency order of ids.
	byID := make(map[string]GameDTO, len(games))
	for i := range games {
		byID[games[i].ID] = toDTO(games[i])
	}
	out := make([]GameDTO, 0, len(ids))
	for _, id := range ids {
		if dto, ok := byID[id]; ok {
			out = append(out, dto)
		}
	}
	return out, nil
}
