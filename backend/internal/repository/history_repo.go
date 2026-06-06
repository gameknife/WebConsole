package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"webconsole/internal/model"
)

// HistoryRepository provides access to PlayHistory records and recency queries.
type HistoryRepository struct{ db *gorm.DB }

// NewHistoryRepository constructs a HistoryRepository.
func NewHistoryRepository(db *gorm.DB) *HistoryRepository { return &HistoryRepository{db: db} }

// Record adds played seconds to a game's history, creating the row if needed,
// and updates the last-played timestamp.
func (r *HistoryRepository) Record(gameID string, seconds int64) error {
	var h model.PlayHistory
	err := r.db.First(&h, "game_id = ? AND user_id = ?", gameID, model.LocalUserID).Error
	now := time.Now()

	if errors.Is(err, gorm.ErrRecordNotFound) {
		h = model.PlayHistory{
			ID:           gameID + "-" + model.LocalUserID,
			GameID:       gameID,
			UserID:       model.LocalUserID,
			LastPlayedAt: now,
			PlaySeconds:  seconds,
		}
		return r.db.Create(&h).Error
	}
	if err != nil {
		return err
	}

	h.PlaySeconds += seconds
	h.LastPlayedAt = now
	return r.db.Save(&h).Error
}

// RecentGameIDs returns up to limit game IDs ordered by most-recently played.
func (r *HistoryRepository) RecentGameIDs(limit int) ([]string, error) {
	var ids []string
	err := r.db.Model(&model.PlayHistory{}).
		Where("user_id = ?", model.LocalUserID).
		Order("last_played_at DESC").
		Limit(limit).
		Pluck("game_id", &ids).Error
	return ids, err
}
