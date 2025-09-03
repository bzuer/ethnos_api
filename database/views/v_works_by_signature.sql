*************************** 1. row ***************************
                View: v_works_by_signature
         Create View: CREATE ALGORITHM=UNDEFINED DEFINER=`pc`@`%` SQL SECURITY DEFINER VIEW `v_works_by_signature` AS select `s`.`id` AS `signature_id`,`s`.`signature` AS `signature_text`,`p`.`id` AS `person_id`,`p`.`preferred_name` AS `preferred_name`,`w`.`id` AS `work_id`,`w`.`title` AS `title`,`pub`.`year` AS `publication_year` from (((((`works` `w` join `publications` `pub` on(`w`.`id` = `pub`.`work_id`)) join `authorships` `a` on(`w`.`id` = `a`.`work_id`)) join `persons` `p` on(`a`.`person_id` = `p`.`id`)) join `persons_signatures` `ps` on(`p`.`id` = `ps`.`person_id`)) join `signatures` `s` on(`ps`.`signature_id` = `s`.`id`)) order by `s`.`signature`,`pub`.`year` desc
character_set_client: utf8mb3
collation_connection: utf8mb3_general_ci
