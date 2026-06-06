package repository

import (
	"errors"

	"gorm.io/gorm"

	"webconsole/internal/model"
)

// SaveRepository provides access to SaveState records.
type SaveRepository struct{ db *gorm.DB }

// NewSaveRepository constructs a SaveRepository.
func NewSaveRepository(db *gorm.DB) *SaveRepository { return &SaveRepository{db: db} }

// ListByGame returns all save slots for a game, ordered by slot.
func (r *SaveRepository) ListByGame(gameID string) ([]model.SaveState, error) {
	var saves []model.SaveState
	err := r.db.Where("game_id = ? AND user_id = ?", gameID, model.LocalUserID).
		Order("slot ASC").Find(&saves).Error
	return saves, err
}

// Get returns a single save by ID, or ErrNotFound.
func (r *SaveRepository) Get(id string) (model.SaveState, error) {
	var s model.SaveState
	err := r.db.First(&s, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return s, ErrNotFound
	}
	return s, err
}

// Upsert inserts or updates a save slot (keyed by primary id).
func (r *SaveRepository) Upsert(s *model.SaveState) error {
	return r.db.Save(s).Error
}

// Delete removes a save by ID.
func (r *SaveRepository) Delete(id string) error {
	return r.db.Delete(&model.SaveState{}, "id = ?", id).Error
}
