package postgres

// UserRepo is an implementation of the UserRepository interface for Postgres using GORM.
// - This file is part of the Interface Adapters Layer in Clean Code Architecture.
// - Adapts domain repository interfaces to actual database operations using GORM.
// - Keeps business logic decoupled from database details.
// - Makes it easy to swap out or mock the DB implementation for testing or future changes.

import (
	"auth-module/internal/domain/entity"
	"auth-module/internal/infrastructure/database/models"
	"context"
	"errors"

	"gorm.io/gorm"
)

type PostgresUserRepo struct {
	db *gorm.DB
}

func NewPostgresUserRepo(db *gorm.DB) *PostgresUserRepo {
	return &PostgresUserRepo{db: db}
}

func (r *PostgresUserRepo) Create(ctx context.Context, user *entity.User) (*entity.User, error) {
	// Convert domain entity to GORM model
	model := models.FromEntity(user)

	// Create record in database
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return nil, err
	}

	// Convert back to domain entity with generated ID
	return model.ToEntity(), nil
}

func (r *PostgresUserRepo) GetByID(ctx context.Context, id entity.UserID) (*entity.User, error) {
	var model models.UserModel
	
	// Parse UserID to uint for GORM query
	parsedID, err := entity.ParseUserIDToUint(id)
	if err != nil {
		return nil, err
	}

	if err := r.db.WithContext(ctx).First(&model, parsedID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}

func (r *PostgresUserRepo) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var model models.UserModel

	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}

func (r *PostgresUserRepo) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	var model models.UserModel

	if err := r.db.WithContext(ctx).Where("username = ?", username).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}

func (r *PostgresUserRepo) Update(ctx context.Context, user *entity.User) error {
	// Convert domain entity to GORM model
	model := models.FromEntity(user)

	// Update record in database
	return r.db.WithContext(ctx).Save(model).Error
}

func (r *PostgresUserRepo) Delete(ctx context.Context, id entity.UserID) error {
	// Parse UserID to uint for GORM query
	parsedID, err := entity.ParseUserIDToUint(id)
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Delete(&models.UserModel{}, parsedID).Error
}

func (r *PostgresUserRepo) List(ctx context.Context, limit, offset int) ([]*entity.User, error) {
	var models []models.UserModel

	if err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&models).Error; err != nil {
		return nil, err
	}

	// Convert models to domain entities
	users := make([]*entity.User, len(models))
	for i, model := range models {
		users[i] = model.ToEntity()
	}

	return users, nil
}

func (r *PostgresUserRepo) Count(ctx context.Context) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.UserModel{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *PostgresUserRepo) Search(ctx context.Context, query string, limit, offset int) ([]*entity.User, error) {
	var models []models.UserModel

	// Search in username, email, first_name, or last_name
	searchPattern := "%" + query + "%"
	if err := r.db.WithContext(ctx).Where(
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

func (r *PostgresUserRepo) GetByEmailOrUsername(ctx context.Context, emailOrUsername string) (*entity.User, error) {
	var model models.UserModel

	if err := r.db.WithContext(ctx).Where("email = ? OR username = ?", emailOrUsername, emailOrUsername).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return model.ToEntity(), nil
}
