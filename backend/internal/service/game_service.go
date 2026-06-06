// Package service holds business logic, translating between repository models
// and the DTOs exposed over the REST API.
package service

import (
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"webconsole/internal/model"
	"webconsole/internal/repository"
)

// GameDTO is the API representation of a game. It exposes URLs (not filesystem
// paths) and tags as a parsed string slice.
type GameDTO struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	NameCn      string   `json:"nameCn"`
	Platform    string   `json:"platform"`
	Core        string   `json:"core"`
	Description string   `json:"description"`
	Cover       string   `json:"cover"`
	RomURL      string   `json:"romUrl"`
	BiosURL     string   `json:"biosUrl"`
	FileSize    int64    `json:"fileSize"`
	PlayCount   int64    `json:"playCount"`
	Tags        []string `json:"tags"`
}

// GameService exposes game-library operations.
type GameService struct {
	repo      *repository.GameRepository
	coversDir string
}

// NewGameService constructs a GameService rooted at coversDir for cover art.
func NewGameService(repo *repository.GameRepository, coversDir string) *GameService {
	return &GameService{repo: repo, coversDir: coversDir}
}

// MetadataPatch holds editable game metadata fields. Nil pointers are left
// unchanged.
type MetadataPatch struct {
	Name        *string   `json:"name"`
	NameCn      *string   `json:"nameCn"`
	Description *string   `json:"description"`
	Tags        *[]string `json:"tags"`
}

// UpdateMetadata applies a metadata patch to a game and returns the updated DTO.
func (s *GameService) UpdateMetadata(id string, patch MetadataPatch) (GameDTO, error) {
	g, err := s.repo.Get(id)
	if err != nil {
		return GameDTO{}, err
	}
	if patch.Name != nil {
		g.Name = *patch.Name
	}
	if patch.NameCn != nil {
		g.NameCn = *patch.NameCn
	}
	if patch.Description != nil {
		g.Description = *patch.Description
	}
	if patch.Tags != nil {
		raw, _ := json.Marshal(*patch.Tags)
		g.Tags = string(raw)
	}
	if err := s.repo.Update(&g); err != nil {
		return GameDTO{}, err
	}
	return toDTO(g), nil
}

// SaveCover stores an uploaded cover image for a game and updates its CoverPath.
func (s *GameService) SaveCover(id string, file *multipart.FileHeader) (GameDTO, error) {
	g, err := s.repo.Get(id)
	if err != nil {
		return GameDTO{}, err
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".png"
	}
	dir := filepath.Join(s.coversDir, g.Platform)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return GameDTO{}, fmt.Errorf("mkdir %q: %w", dir, err)
	}
	dest := filepath.Join(dir, g.ID+ext)
	if err := writeUpload(file, dest); err != nil {
		return GameDTO{}, err
	}

	g.CoverPath = "/covers/" + g.Platform + "/" + g.ID + ext
	if err := s.repo.Update(&g); err != nil {
		return GameDTO{}, err
	}
	return toDTO(g), nil
}

// writeUpload copies a multipart file to dest.
func writeUpload(fh *multipart.FileHeader, dest string) error {
	src, err := fh.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, src)
	return err
}

// List returns matching games as DTOs plus the total count.
func (s *GameService) List(q repository.GameQuery) ([]GameDTO, int64, error) {
	games, total, err := s.repo.List(q)
	if err != nil {
		return nil, 0, err
	}
	dtos := make([]GameDTO, 0, len(games))
	for i := range games {
		dtos = append(dtos, toDTO(games[i]))
	}
	return dtos, total, nil
}

// Get returns a single game DTO by ID.
func (s *GameService) Get(id string) (GameDTO, error) {
	g, err := s.repo.Get(id)
	if err != nil {
		return GameDTO{}, err
	}
	return toDTO(g), nil
}

// PlatformCounts returns per-platform game counts.
func (s *GameService) PlatformCounts() ([]repository.PlatformCount, error) {
	return s.repo.PlatformCounts()
}

// MostPlayed returns up to limit games with the highest play counts.
func (s *GameService) MostPlayed(limit int) ([]GameDTO, error) {
	games, err := s.repo.TopPlayed(limit)
	if err != nil {
		return nil, err
	}
	dtos := make([]GameDTO, 0, len(games))
	for i := range games {
		dtos = append(dtos, toDTO(games[i]))
	}
	return dtos, nil
}

// Tags returns the distinct, de-duplicated set of tags across the library.
func (s *GameService) Tags() ([]string, error) {
	raws, err := s.repo.RawTags()
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, raw := range raws {
		for _, t := range parseTags(raw) {
			if _, ok := seen[t]; !ok {
				seen[t] = struct{}{}
				out = append(out, t)
			}
		}
	}
	return out, nil
}

// toDTO maps a model.Game to its API representation, deriving static URLs from
// the stored relative paths.
func toDTO(g model.Game) GameDTO {
	return GameDTO{
		ID:          g.ID,
		Name:        g.Name,
		NameCn:      g.NameCn,
		Platform:    g.Platform,
		Core:        g.Core,
		Description: g.Description,
		Cover:       g.CoverPath,
		RomURL:      romURL(g),
		BiosURL:     g.BiosPath,
		FileSize:    g.FileSize,
		PlayCount:   g.PlayCount,
		Tags:        parseTags(g.Tags),
	}
}

// romURL derives the public ROM URL from the platform and stored ROM path.
func romURL(g model.Game) string {
	if g.RomPath == "" {
		return ""
	}
	return "/roms/" + g.Platform + "/" + filepath.Base(g.RomPath)
}

// parseTags decodes the JSON-array tag string into a slice, tolerating empties.
func parseTags(raw string) []string {
	if raw == "" {
		return []string{}
	}
	var tags []string
	if err := json.Unmarshal([]byte(raw), &tags); err != nil {
		return []string{}
	}
	return tags
}
