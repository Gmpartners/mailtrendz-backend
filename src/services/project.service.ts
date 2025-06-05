  // Duplicar projeto
  async duplicateProject(projectId: string, userId: string): Promise<DuplicateProjectResponse | null> {
    try {
      const originalProject = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })

      if (!originalProject) {
        return null
      }

      const duplicatedProject = new Project({
        userId: originalProject.userId,
        name: `${originalProject.name} (Cópia)`,
        description: originalProject.description,
        type: originalProject.type,
        status: 'draft',
        content: originalProject.content,
        metadata: {
          ...originalProject.metadata,
          version: 1
        },
        tags: [...originalProject.tags, 'Duplicado'],
        color: originalProject.color,
        isPublic: false
      })

      await duplicatedProject.save()

      // Criar chat para o projeto duplicado
      await this.createProjectChat(duplicatedProject._id as Types.ObjectId, userId)

      logger.info('Project duplicated', {
        originalId: projectId,
        duplicatedId: duplicatedProject._id.toString(),
        userId
      })

      // Agora DuplicateProjectResponse = IProject, então usar a mesma conversão
      const projectData: DuplicateProjectResponse = {
        _id: duplicatedProject._id as Types.ObjectId,
        userId: duplicatedProject.userId,
        name: duplicatedProject.name,
        description: duplicatedProject.description,
        type: duplicatedProject.type,
        status: duplicatedProject.status,
        content: duplicatedProject.content,
        metadata: duplicatedProject.metadata,
        stats: duplicatedProject.stats,
        tags: duplicatedProject.tags,
        color: duplicatedProject.color,
        isPublic: duplicatedProject.isPublic,
        chatId: duplicatedProject.chatId,
        createdAt: duplicatedProject.createdAt,
        updatedAt: duplicatedProject.updatedAt
      }

      return projectData
    } catch (error) {
      logger.error('Duplicate project failed:', error)
      throw error
    }
  }
