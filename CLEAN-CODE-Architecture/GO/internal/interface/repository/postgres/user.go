package postgres

// UserRepo is an implementation of the UserRepository interface for Postgres using GORM.
// - This file is part of the Interface Adapters Layer in Clean Code Architecture.
// - Adapts domain repository interfaces to actual database operations using GORM.
// - Keeps business logic decoupled from database details.
// - Makes it easy to swap out or mock the DB implementation for testing or future changes.

import (
	"auth-module/internal/domain/entity"
	"auth-module/internal/infrastructure/database/models"
	"errors"

	"gorm.io/gorm"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(user *entity.User) (*entity.User, error) {
	// Convert domain entity to GORM model
	model := models.FromEntity(user)

	// Create record in database
	if err := r.db.Create(model).Error; err != nil {
		return nil, err
	}

	// Convert back to domain entity with generated ID
	return model.ToEntity(), nil
}

func (r *UserRepo) FindByID(id entity.UserID) (*entity.User, error) {
	var model models.UserModel
	
	// Parse UserID to uint for GORM query
	parsedID, err := entity.ParseUserIDToUint(id)
	if err != nil {
		return nil, err
	}

	if err := r.db.First(&model, parsedID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}

func (r *UserRepo) FindByEmail(email string) (*entity.User, error) {
	var model models.UserModel

	if err := r.db.Where("email = ?", email).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}

func (r *UserRepo) FindByUsername(username string) (*entity.User, error) {
	var model models.UserModel

	if err := r.db.Where("username = ?", username).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}

func (r *UserRepo) Update(user *entity.User) error {
	// Convert domain entity to GORM model
	model := models.FromEntity(user)

	// Update record in database
	return r.db.Save(model).Error
}

func (r *UserRepo) Delete(id entity.UserID) error {
	// Parse UserID to uint for GORM query
	parsedID, err := entity.ParseUserIDToUint(id)
	if err != nil {
		return err
	}

	return r.db.Delete(&models.UserModel{}, parsedID).Error
}

func (r *UserRepo) List(limit, offset int) ([]*entity.User, error) {
	var models []models.UserModel

	if err := r.db.Limit(limit).Offset(offset).Find(&models).Error; err != nil {
		return nil, err
	}

	// Convert models to domain entities
	users := make([]*entity.User, len(models))
	for i, model := range models {
		users[i] = model.ToEntity()
	}

	return users, nil
}

func (r *UserRepo) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&models.UserModel{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *UserRepo) Search(query string, limit, offset int) ([]*entity.User, error) {
	var models []models.UserModel

	// Search in username, email, first_name, or last_name
	searchPattern := "%" + query + "%"
	if err := r.db.Where(
		"username ILIKE ? OR email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?",
		searchPattern, searchPattern, searchPattern, searchPattern,
	).Limit(limit).Offset(offset).Find(&models).Error; err != nil {
		return nil, err
	}

	// Convert models to domain entities
	users := make([]*entity.User, len(models))
	for i, model := range models {
		users[i] = model.ToEntity()
	}

	return users, nil
}

func (r *UserRepo) FindByEmailOrUsername(emailOrUsername string) (*entity.User, error) {
	var model models.UserModel

	if err := r.db.Where("email = ? OR username = ?", emailOrUsername, emailOrUsername).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}
