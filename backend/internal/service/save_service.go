package service

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"webconsole/internal/model"
	"webconsole/internal/repository"
)

// SaveDTO is the API representation of a save slot.
type SaveDTO struct {
	ID          string    `json:"id"`
	GameID      string    `json:"gameId"`
	Slot        int       `json:"slot"`
	Screenshot  string    `json:"screenshot"`  // public URL, may be empty
	DownloadURL string    `json:"downloadUrl"` // binary state download URL
	SizeBytes   int64     `json:"sizeBytes"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// SaveService manages save-state slots: their DB rows and on-disk files.
type SaveService struct {
	repo     *repository.SaveRepository
	savesDir string
}

// NewSaveService constructs a SaveService rooted at savesDir.
func NewSaveService(repo *repository.SaveRepository, savesDir string) *SaveService {
	return &SaveService{repo: repo, savesDir: savesDir}
}

// ListByGame returns the save slots for a game as DTOs.
func (s *SaveService) ListByGame(gameID string) ([]SaveDTO, error) {
	saves, err := s.repo.ListByGame(gameID)
	if err != nil {
		return nil, err
	}
	dtos := make([]SaveDTO, 0, len(saves))
	for i := range saves {
		dtos = append(dtos, s.toDTO(saves[i]))
	}
	return dtos, nil
}

// StatePath returns the on-disk path of a save's binary state, for download.
func (s *SaveService) StatePath(id string) (string, string, error) {
	rec, err := s.repo.Get(id)
	if err != nil {
		return "", "", err
	}
	return rec.StatePath, fmt.Sprintf("%s-slot%d.state", rec.GameID, rec.Slot), nil
}

// Save writes (or overwrites) a slot's state file and optional screenshot, then
// upserts the DB row. The slot id is deterministic so re-saving overwrites.
func (s *SaveService) Save(
	gameID string,
	slot int,
	state *multipart.FileHeader,
	screenshot *multipart.FileHeader,
) (SaveDTO, error) {
	dir := filepath.Join(s.savesDir, gameID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return SaveDTO{}, fmt.Errorf("mkdir %q: %w", dir, err)
	}

	statePath := filepath.Join(dir, fmt.Sprintf("slot-%d.state", slot))
	size, err := saveUpload(state, statePath)
	if err != nil {
		return SaveDTO{}, fmt.Errorf("write state: %w", err)
	}

	screenshotURL := ""
	if screenshot != nil {
		shotPath := filepath.Join(dir, fmt.Sprintf("slot-%d.png", slot))
		if _, err := saveUpload(screenshot, shotPath); err == nil {
			screenshotURL = fmt.Sprintf("/saves/%s/slot-%d.png", gameID, slot)
		}
	}

	now := time.Now()
	rec := model.SaveState{
		ID:         fmt.Sprintf("%s-s%d", gameID, slot),
		GameID:     gameID,
		UserID:     model.LocalUserID,
		Slot:       slot,
		StatePath:  statePath,
		Screenshot: screenshotURL,
		SizeBytes:  size,
		UpdatedAt:  now,
	}
	// Preserve original CreatedAt when overwriting.
	if existing, err := s.repo.Get(rec.ID); err == nil {
		rec.CreatedAt = existing.CreatedAt
		if screenshotURL == "" {
			rec.Screenshot = existing.Screenshot
		}
	} else {
		rec.CreatedAt = now
	}

	if err := s.repo.Upsert(&rec); err != nil {
		return SaveDTO{}, err
	}
	return s.toDTO(rec), nil
}

// Delete removes a save slot's DB row and its on-disk files.
func (s *SaveService) Delete(id string) error {
	rec, err := s.repo.Get(id)
	if err != nil {
		return err
	}
	if rec.StatePath != "" {
		_ = os.Remove(rec.StatePath)
	}
	shotPath := filepath.Join(s.savesDir, rec.GameID, fmt.Sprintf("slot-%d.png", rec.Slot))
	_ = os.Remove(shotPath)
	return s.repo.Delete(id)
}

func (s *SaveService) toDTO(rec model.SaveState) SaveDTO {
	return SaveDTO{
		ID:          rec.ID,
		GameID:      rec.GameID,
		Slot:        rec.Slot,
		Screenshot:  rec.Screenshot,
		DownloadURL: "/api/v1/saves/download/" + rec.ID,
		SizeBytes:   rec.SizeBytes,
		CreatedAt:   rec.CreatedAt,
		UpdatedAt:   rec.UpdatedAt,
	}
}

// saveUpload copies a multipart file to dest, returning bytes written.
func saveUpload(fh *multipart.FileHeader, dest string) (int64, error) {
	src, err := fh.Open()
	if err != nil {
		return 0, err
	}
	defer src.Close()

	out, err := os.Create(dest)
	if err != nil {
		return 0, err
	}
	defer out.Close()

	return io.Copy(out, src)
}
