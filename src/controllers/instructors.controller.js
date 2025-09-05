const instructorsService = require('../services/instructors.service');
const { handleError } = require('../middleware/errorHandler');

class InstructorsController {

  /**
   * @swagger
   * /instructors:
   *   get:
   *     summary: Get list of instructors
   *     description: Retrieve paginated list of course instructors with optional filtering
   *     tags: [Instructors]
   *     parameters:
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: ['PROFESSOR', 'ASSISTANT', 'TA', 'GUEST']
   *         description: Filter by instructor role
   *       - in: query
   *         name: program_id
   *         schema:
   *           type: integer
   *         description: Filter by program ID
   *       - in: query
   *         name: year_from
   *         schema:
   *           type: integer
   *         description: Filter courses from this year
   *       - in: query
   *         name: year_to
   *         schema:
   *           type: integer
   *         description: Filter courses to this year
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in instructor names
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of instructors to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of instructors to skip
   *     responses:
   *       200:
   *         description: Successfully retrieved instructors
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 instructors:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Instructor'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationMeta'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getInstructors(req, res) {
    try {
      const filters = {
        role: req.query.role,
        program_id: req.query.program_id,
        year_from: req.query.year_from,
        year_to: req.query.year_to,
        search: req.query.search,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const result = await instructorsService.getInstructors(filters);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /instructors/{id}:
   *   get:
   *     summary: Get instructor details
   *     description: Retrieve detailed information about a specific instructor
   *     tags: [Instructors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Person ID (instructor)
   *     responses:
   *       200:
   *         description: Successfully retrieved instructor details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/InstructorDetails'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getInstructorById(req, res) {
    try {
      const instructor = await instructorsService.getInstructorById(req.params.id);
      
      if (!instructor) {
        return res.status(404).json({ 
          error: 'Instructor not found',
          message: `No instructor found with ID ${req.params.id}`
        });
      }

      res.json(instructor);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /instructors/{id}/courses:
   *   get:
   *     summary: Get instructor courses
   *     description: Retrieve courses taught by a specific instructor
   *     tags: [Instructors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Person ID (instructor)
   *       - in: query
   *         name: year_from
   *         schema:
   *           type: integer
   *         description: Filter courses from this year
   *       - in: query
   *         name: year_to
   *         schema:
   *           type: integer
   *         description: Filter courses to this year
   *       - in: query
   *         name: program_id
   *         schema:
   *           type: integer
   *         description: Filter by program ID
   *       - in: query
   *         name: semester
   *         schema:
   *           type: string
   *           enum: ['1', '2', 'SUMMER', 'WINTER', 'YEAR_LONG']
   *         description: Filter by semester
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: ['PROFESSOR', 'ASSISTANT', 'TA', 'GUEST']
   *         description: Filter by instructor role
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of courses to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of courses to skip
   *     responses:
   *       200:
   *         description: Successfully retrieved instructor courses
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/InstructorCourse'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getInstructorCourses(req, res) {
    try {
      const filters = {
        year_from: req.query.year_from,
        year_to: req.query.year_to,
        program_id: req.query.program_id,
        semester: req.query.semester,
        role: req.query.role,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const courses = await instructorsService.getInstructorCourses(req.params.id, filters);
      res.json(courses);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /instructors/{id}/subjects:
   *   get:
   *     summary: Get instructor subject expertise
   *     description: Retrieve subjects/topics that an instructor has expertise in based on courses taught
   *     tags: [Instructors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Person ID (instructor)
   *       - in: query
   *         name: vocabulary
   *         schema:
   *           type: string
   *           enum: ['KEYWORD', 'MESH', 'LCSH', 'DDC', 'UDC', 'CUSTOM']
   *         description: Filter by vocabulary type
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of subjects to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of subjects to skip
   *     responses:
   *       200:
   *         description: Successfully retrieved instructor subjects expertise
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/InstructorSubject'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getInstructorSubjects(req, res) {
    try {
      const filters = {
        vocabulary: req.query.vocabulary,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const subjects = await instructorsService.getInstructorSubjectsExpertise(req.params.id, filters);
      res.json(subjects);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /instructors/{id}/bibliography:
   *   get:
   *     summary: Get instructor bibliography
   *     description: Retrieve works used by an instructor in their courses
   *     tags: [Instructors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Person ID (instructor)
   *       - in: query
   *         name: reading_type
   *         schema:
   *           type: string
   *           enum: ['REQUIRED', 'RECOMMENDED', 'SUPPLEMENTARY']
   *         description: Filter by reading type
   *       - in: query
   *         name: year_from
   *         schema:
   *           type: integer
   *         description: Filter works from this publication year
   *       - in: query
   *         name: year_to
   *         schema:
   *           type: integer
   *         description: Filter works to this publication year
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of bibliography items to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of bibliography items to skip
   *     responses:
   *       200:
   *         description: Successfully retrieved instructor bibliography
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/InstructorBibliography'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getInstructorBibliography(req, res) {
    try {
      const filters = {
        reading_type: req.query.reading_type,
        year_from: req.query.year_from,
        year_to: req.query.year_to,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const bibliography = await instructorsService.getInstructorBibliography(req.params.id, filters);
      res.json({
        status: 'success',
        data: bibliography
      });
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /instructors/{id}/statistics:
   *   get:
   *     summary: Get comprehensive instructor profile
   *     description: Retrieve detailed instructor information combining teaching activities, authorship, signatures, bibliography usage, and academic collaboration patterns
   *     tags: [Instructors]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Person ID (instructor)
   *     responses:
   *       200:
   *         description: Successfully retrieved comprehensive instructor profile
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ComprehensiveInstructorProfile'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getInstructorStatistics(req, res) {
    try {
      const statistics = await instructorsService.getInstructorStatistics(req.params.id);
      
      if (!statistics) {
        return res.status(404).json({ 
          error: 'Instructor not found',
          message: `No instructor found with ID ${req.params.id}`
        });
      }

      res.json(statistics);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /instructors/statistics:
   *   get:
   *     summary: Get instructors statistics
   *     description: Retrieve statistical information about instructors
   *     tags: [Instructors]
   *     responses:
   *       200:
   *         description: Successfully retrieved instructors statistics
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/InstructorsStatistics'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getInstructorsStatistics(req, res) {
    try {
      const statistics = await instructorsService.getInstructorsStatistics();
      res.json(statistics);
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new InstructorsController();