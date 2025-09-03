const coursesService = require('../services/courses.service');
const { handleError } = require('../middleware/errorHandler');

class CoursesController {

  /**
   * @swagger
   * /courses:
   *   get:
   *     summary: Get list of courses
   *     description: Retrieve paginated list of courses with optional filtering
   *     tags: [Courses]
   *     parameters:
   *       - in: query
   *         name: program_id
   *         schema:
   *           type: integer
   *         description: Filter by program ID
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *         description: Filter by academic year
   *       - in: query
   *         name: semester
   *         schema:
   *           type: string
   *           enum: ['1', '2', 'SUMMER', 'WINTER', 'YEAR_LONG']
   *         description: Filter by semester
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in course name or code
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
   *         description: Successfully retrieved courses
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 courses:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Course'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationMeta'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getCourses(req, res) {
    try {
      const filters = {
        program_id: req.query.program_id,
        year: req.query.year,
        semester: req.query.semester,
        search: req.query.search,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const result = await coursesService.getCourses(filters);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /courses/{id}:
   *   get:
   *     summary: Get comprehensive course details
   *     description: Retrieve detailed course information including basic details, bibliography, instructors, and related subjects
   *     tags: [Courses]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Course ID
   *       - in: query
   *         name: include_bibliography
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include bibliography in response
   *       - in: query
   *         name: include_instructors
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include instructors in response
   *       - in: query
   *         name: include_subjects
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include subjects in response
   *       - in: query
   *         name: bibliography_limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Limit bibliography items
   *       - in: query
   *         name: instructors_limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Limit instructor items
   *       - in: query
   *         name: subjects_limit
   *         schema:
   *           type: integer
   *           default: 30
   *         description: Limit subject items
   *     responses:
   *       200:
   *         description: Successfully retrieved comprehensive course details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ComprehensiveCourseDetails'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getCourseById(req, res) {
    try {
      const courseId = req.params.id;
      const includeBibliography = req.query.include_bibliography !== 'false';
      const includeInstructors = req.query.include_instructors !== 'false';
      const includeSubjects = req.query.include_subjects !== 'false';
      
      const bibliographyLimit = parseInt(req.query.bibliography_limit) || 50;
      const instructorsLimit = parseInt(req.query.instructors_limit) || 20;
      const subjectsLimit = parseInt(req.query.subjects_limit) || 30;

      const courseDetails = await coursesService.getCourseDetailsById(
        courseId, 
        {
          includeBibliography,
          includeInstructors,
          includeSubjects,
          bibliographyLimit,
          instructorsLimit,
          subjectsLimit
        }
      );
      
      if (!courseDetails.course) {
        return res.status(404).json({ 
          error: 'Course not found',
          message: `No course found with ID ${courseId}`
        });
      }

      res.json({
        ...courseDetails.course,
        bibliography: courseDetails.bibliography,
        instructors: courseDetails.instructors,
        subjects: courseDetails.subjects,
        bibliography_statistics: courseDetails.bibliography_statistics,
        instructor_statistics: courseDetails.instructor_statistics,
        subject_statistics: courseDetails.subject_statistics,
        combined_statistics: courseDetails.combined_statistics
      });
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /courses/{id}/instructors:
   *   get:
   *     summary: Get course instructors
   *     description: Retrieve instructors for a specific course
   *     tags: [Courses]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Course ID
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
   *         description: Successfully retrieved course instructors
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/CourseInstructor'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getCourseInstructors(req, res) {
    try {
      const filters = {
        role: req.query.role,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const instructors = await coursesService.getCourseInstructors(req.params.id, filters);
      res.json(instructors);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /courses/{id}/bibliography:
   *   get:
   *     summary: Get course bibliography
   *     description: Retrieve bibliography/reading list for a specific course
   *     tags: [Courses]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Course ID
   *       - in: query
   *         name: reading_type
   *         schema:
   *           type: string
   *           enum: ['REQUIRED', 'RECOMMENDED', 'SUPPLEMENTARY']
   *         description: Filter by reading type
   *       - in: query
   *         name: week_number
   *         schema:
   *           type: integer
   *         description: Filter by week number
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
   *         description: Successfully retrieved course bibliography
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/BibliographyEntry'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getCourseBibliography(req, res) {
    try {
      const filters = {
        reading_type: req.query.reading_type,
        week_number: req.query.week_number,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const bibliography = await coursesService.getCourseBibliography(req.params.id, filters);
      res.json(bibliography);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /courses/{id}/subjects:
   *   get:
   *     summary: Get course subjects
   *     description: Retrieve subjects/topics covered in a specific course based on bibliography
   *     tags: [Courses]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Course ID
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
   *           default: 50
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
   *         description: Successfully retrieved course subjects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Subject'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getCourseSubjects(req, res) {
    try {
      const filters = {
        vocabulary: req.query.vocabulary,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      const subjects = await coursesService.getCourseSubjects(req.params.id, filters);
      res.json(subjects);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * @swagger
   * /courses/statistics:
   *   get:
   *     summary: Get courses statistics
   *     description: Retrieve statistical information about courses
   *     tags: [Courses]
   *     responses:
   *       200:
   *         description: Successfully retrieved courses statistics
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CoursesStatistics'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getCoursesStatistics(req, res) {
    try {
      const statistics = await coursesService.getCoursesStatistics();
      res.json(statistics);
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new CoursesController();